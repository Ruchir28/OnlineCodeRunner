const amqp = require("amqplib");
const { uuid } = require("uuidv4");
const runCode = require('./CodeRunner');

async function intialiseRabbitMQ(queue_name, reply_queue, retries = 0) {
  let map = new Map();

  try {
    await wait(5);
    let connection = await amqp.connect(process.env.RABBITMQ_URL);
    let channel = await connection.createChannel();
    await channel.assertQueue(queue_name, { durable: false });
    await channel.assertQueue(reply_queue, { durable: false });

    // PROCESSING THE JOBS IN QUEUE
    channel.consume(
      queue_name,
      async (message_received) => {
        let message_corr_id = message_received.properties.correlationId;
        console.log(
          `[PROCESSING JOB QUEUE] Received in queue -:-:-> ${message_received.content.toString()}`
        );
        let codeToRun = message_received.content.toString();
        let result;
        try {
            result = await runCode(codeToRun);
        } catch (err) {
            console.log(err);
            result = err.message
        }

        console.log(`[PROCESSING JOB QUEUE] RESULT: ${result}`);

        channel.sendToQueue(reply_queue, Buffer.from(result), {
            correlationId: message_corr_id,
          });
      }
    );

    // GETTING THE REPLIES AND SENDING BACK TO THE USER
    channel.consume(
        reply_queue,
        async (message_received) => {
          let message_corr_id = message_received.properties.correlationId;
          console.log(
            `[REPLYQUEUE] Received in queue -:-:-> ${message_received.content.toString()}`
          );
          map.get(message_corr_id).resolve(message_received.content.toString())
        }
      );

    let sendMessage = async (message) => {
      try {
        let corrId = uuid();
        await channel.assertQueue(queue_name, { durable: false });
        channel.sendToQueue(queue_name, Buffer.from(message), {
          replyTo: reply_queue,
          correlationId: corrId,
        });
        console.log(" [x] Sent %s", message);
        return true;
      } catch (error) {
        console.warn("Error sending message: ", error);
        return false;
      }
    };

    let subscribeToMessages = async (callback, options) => {
      try {
        await channel.assertQueue(reply_queue, { durable: false });
        channel.consume(reply_queue, callback, options);
        channel.consume(queue_name, callback, options);
      } catch (error) {
        console.warn("Error subscribing to messages: ", error);
      }
    };

    let executeTask = (task) => {
      return new Promise(async (resolve, reject) => {
        try {
          let corrId = uuid();
          await channel.assertQueue(queue_name, { durable: false });
          await channel.assertQueue(reply_queue, { durable: false });
          channel.sendToQueue(queue_name, Buffer.from(task), {
            replyTo: reply_queue,
            correlationId: corrId,
          });
          map.set(corrId, { resolve, reject });
          console.log(" [ExecuteTask] Sent %s", task);
        } catch (err) {
          reject(err);
        }
      });
    };

    let closeConnection = async () => {
      await channel.close();
      await connection.close();
    };

    return {
      sendMessage,
      subscribeToMessages,
      closeConnection,
      executeTask,
    };
  } catch (err) {
    console.warn(err);
    if (retries > 5) {
      console.warn(err);
      throw new Error(
        `Can't Connect to RabbitMQ, Try Again after some time Retried ${retries} times`
      );
    }
    return intialiseRabbitMQ(queue_name, reply_queue, retries + 1);
  }
}

function wait(seconds) {
  var timeInms = seconds * 1000;
  return new Promise((resolve, reject) => {
    setTimeout(resolve, timeInms);
  });
}

module.exports = intialiseRabbitMQ;
