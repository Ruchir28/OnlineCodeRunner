const amqp = require("amqplib");
const { uuid } = require("uuidv4");

async function intialiseRabbitMQ(queue_name, reply_queue, retries = 0) {
  let map = new Map();

  try {
    await wait(5);
    let connection = await amqp.connect(process.env.RABBITMQ_URL);
    let channel = await connection.createChannel();
    await channel.assertQueue(queue_name, { durable: false });
    await channel.assertQueue(reply_queue, { durable: false });

    // MOCK PROCESSING THE JOBS IN QUEUE
    channel.consume(
      queue_name,
      async (message_received) => {
        let message_corr_id = message_received.properties.correlationId;
        console.log(
          `[PROCESSING JOB QUEUE] Received in queue -:-:-> ${message_received.content.toString()}`
        );
        await wait(2)
        channel.sendToQueue(reply_queue, Buffer.from(message_received.content.toString()), {
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
          await wait(2)
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
          await channel.assertQueue(`${queue_name}-${corrId}`, { durable: false });
          await channel.assertQueue(reply_queue, { durable: false });
          channel.sendToQueue(`${queue_name}-${corrId}`, Buffer.from(task), {
            replyTo: reply_queue,
            correlationId: corrId,
          });
          map.set(corrId, { resolve, reject });
          console.log(" [ExecuteTask] Sent %s", task);
          // console.log(map.keys())
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
