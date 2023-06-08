const express = require("express");
const cors = require("cors");
const intialiseRabbitMQ = require("./messageQueue/RabbitMQ");
const amqp = require("amqplib");
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

intialiseRabbitMQ("Message_Queue", "Reply_Queue", 0).then((rabbitMq) => {
  app.get("/", (req, res) => {
    res.send("Hey There Application is Up and Running");
  });

  app.get("/test", async (req, res) => {
    try {
      let message = {
        language: "Javascript",
        code: `console.log('Hello World ${new Date()}')`,
      };
      console.log("[Endpoint] Endpoint is hit with:" + message);

      let result = await rabbitMq.executeTask(message);
      res.status(200).json({
        executionResult: result
      });
    } catch (err) {
      res.status(500).send(`Task execution Failed ${err}`);
    }
  });

  app.post("/submit", async (req, res) => {
    try {
      let { code } = req.body;
      console.log(req.body);

      let result = await rabbitMq.executeTask(code);
      res.status(200).json({ executionResult: result });
    } catch (err) {
      res.status(500).send(`Task execution Failed ${err}`);
    }
  });
});

app.listen(port, () => {
  console.log(`Example app is listening on port ${port}`);
});
