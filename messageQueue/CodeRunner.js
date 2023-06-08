const Docker = require("dockerode");
const fs = require("fs");
const streamBuffers = require("stream-buffers");

async function runCode(userCode) {
  

  try {
    fs.writeFileSync(`${__dirname}/../tmp/code/user-code.js`, userCode);
  } catch (err) {
    console.error(`[CodeRunner] Failed to write user code to file:`, err);
    throw err;
  }

  console.log("[CodRunner] FILE WRITING DONE");

  let docker = new Docker();


  let container;

  try {
    container = await docker.createContainer({
      Image: "node",
      Cmd: ["node", "/code/user-code.js"],
      AttachStdout: true,
      AttachStderr: true,
      HostConfig: {
        Binds: [`onlinecoderunner_user-code-volume:/code`],
      },
      Volumes: {
        "/code": {}
      }
    });

    await container.start();
  } catch (err) {
    console.log(`[CodeRunner] Error in creating or starting container ${err}`);
    throw err;
  }

  console.log("[CodRunner] CONTAINER CREATED");

  let logsOutput;

  try {
    let logStream = await container.logs({
      follow: true,
      stdout: true,
      stderr: true,
    });

    // We create a new writable stream that we'll use to gather the output of the Docker container.
    const writableStreamBuffer = new streamBuffers.WritableStreamBuffer();

    logStream.pipe(writableStreamBuffer);

    logStream.on("end", () => {
      logsOutput = writableStreamBuffer.getContentsAsString();
      if(logsOutput === false) {
        logsOutput = '';
      }
    });

    logStream.on("error", (err) => {
      // We reject the Promise with the error.
      throw err;
    });
  } catch (err) {
    console.warn(`[CodeRunner] ${err}`);
    throw err;
  }

  try {
    await container.stop();
    await container.remove();
  } catch (err) {
    console.log("[CodeRunner] Cannot stop the container");
  }

  return logsOutput;
}


function wait(seconds) {
  var timeInms = seconds * 1000;
  return new Promise((resolve, reject) => {
    setTimeout(resolve, timeInms);
  });
}

module.exports = runCode;
