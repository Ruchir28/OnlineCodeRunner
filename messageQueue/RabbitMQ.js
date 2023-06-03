const amqp = require('amqplib')

async function intialiseRabbitMQ(queue_name,retries = 0) {
    try {
        await wait(5);
        let connection = await amqp.connect(process.env.RABBITMQ_URL);
        let channel = await connection.createChannel();
        await channel.assertQueue(queue_name, { durable: false });

        let sendMessage = async (message) => {
            try {
                await channel.assertQueue(queue_name, { durable: false });
                channel.sendToQueue(queue_name, Buffer.from(message));
                console.log(" [x] Sent %s", message);
                return true;
            } catch (error) {
                console.warn("Error sending message: ", error);
                return false;
            }
        }

        let subscribeToMessages = async (callback, options) => {
            try {
                await channel.assertQueue(queue_name, { durable: false });
                channel.consume(queue_name, callback, options);
            } catch (error) {
                console.warn("Error subscribing to messages: ", error);
            }
        }

        let closeConnection = async () => {
            await channel.close();
            await connection.close();
        }

        return {
            sendMessage,
            subscribeToMessages,
            closeConnection
        }


      } catch (err) {
        console.warn(err);
        if(retries > 5) {
            console.warn(err);
            throw new Error(`Can't Connect to RabbitMQ, Try Again after some time Retried ${retries} times`);
        }
        return intialiseRabbitMQ(queue_name,retries + 1);
      }
    

}

function wait(seconds) {
    var timeInms = seconds * 1000;
    return new Promise((resolve,reject)=>{
        setTimeout(resolve,timeInms)
    });
}
 

module.exports = intialiseRabbitMQ;