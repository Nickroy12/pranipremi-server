const express = require('express')
const app = express()
const dotenv = require('dotenv')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors')
dotenv.config()
const port = process.env.PORT || 5000
const uri = process.env.MONGODB_URL;
app.use(cors())
app.use(express.json())






// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    const db = client.db('pranipremidb');
    const petsCollection = db.collection('petsinfo') 
    await client.connect();
     app.get('/pets' , async(req , res)=>{
        const cursor = await petsCollection.find().toArray()

        res.json(cursor)
     })
     app.get('/pets/:petId', async(req , res)=>{
        const {petId} = req.params;
        const query = {
            _id:new ObjectId(petId)
        }
        const result = await petsCollection.findOne(query)
        res.send(result)
     })
     app.delete('/pets/:petId', async(req , res)=>{
        const {petId} = req.params;
        const query = {
            _id:new ObjectId(petId)
        }
        const result = await petsCollection.deleteOne(query)
        res.send(result)
     })
     app.post('/pet', async(req , res )=>{
      const newPet = req.body
        const result = await petsCollection.insertOne(query)
        res.send(result)
     })
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res)=>{
    res.send('Pranipremi is running......')
})


app.listen(port , () =>{
    console.log(`Server running at ${port}`);
})