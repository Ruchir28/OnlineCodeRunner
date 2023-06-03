const express = require('express')
const cors = require('cors');
const intialiseRabbitMQ  = require('./messageQueue/RabbitMQ');

const app = express()
const port = 3000

app.use(cors());

intialiseRabbitMQ("Message_Queue").then((rabbitMq) => {

  app.get('/', (req, res) => {
    res.send('Hey There Application is Up and Running');
  });
  
  app.get('/hit',(req,res)=> {
    rabbitMq.sendMessage(`Demo Hits to RabbitMq ${Math.random()*100}`)
  });

  rabbitMq.subscribeToMessages((msg) => console.log(`[RabbitMQ] Received Message ${msg}`));
});





app.listen(port, () => {
  console.log(`Example app is listening on port ${port}`)
});
