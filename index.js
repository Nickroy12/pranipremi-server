const express = require("express");
const app = express();
const dotenv = require("dotenv");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
dotenv.config();
const port = process.env.PORT || 5000;
const uri = process.env.MONGODB_URL;
app.use(cors());
app.use(express.json());

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const db = client.db("pranipremidb");
    const petsCollection = db.collection("petsinfo");
    const adoptionCollection = db.collection("adoptionRequests");
    await client.connect();
app.get("/pets", async (req, res) => {
  try {
    const { name, species } = req.query;

    let query = {};

    if (name) {
      query.petName = {
        $regex: name,
        $options: "i",
      };
    }

    if (species) {
      const speciesArray = species.split(",");

      query.species = {
        $in: speciesArray,
      };
    }

    const result = await petsCollection
      .find(query)
      .sort({ _id: -1 }) 
      .toArray();

    res.send(result);
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to fetch pets",
      error: error.message,
    });
  }
});
    app.get("/pets/:petId", async (req, res) => {
      const { petId } = req.params;
      const query = {
        _id: new ObjectId(petId),
      };
      const result = await petsCollection.findOne(query);
      res.send(result);
    });
    app.delete("/pets/:petId", async (req, res) => {
      const { petId } = req.params;
      const query = {
        _id: new ObjectId(petId),
      };
      const result = await petsCollection.deleteOne(query);
      res.send(result);
    });
app.post("/pets/:petId/adoption-requests", async (req, res) => {
  try {
    const { petId } = req.params;

    const {
      userId,
      userName,
      userEmail,
      pickupDate,
      message,
    } = req.body;

    // ✅ Required fields check
    if (!userId || !pickupDate || !message) {
      return res.status(400).send({
        success: false,
        message: "Missing required fields",
      });
    }

    // ✅ Find pet
    const pet = await petsCollection.findOne({
      _id: new ObjectId(petId),
    });

    // ❌ Pet not found
    if (!pet) {
      return res.status(404).send({
        success: false,
        message: "Pet not found",
      });
    }

    // ❌ Owner cannot adopt own pet
    if (pet.ownerId === userId) {
      return res.status(403).send({
        success: false,
        message: "You cannot adopt your own pet",
      });
    }

    // ❌ Already adopted
    if (pet.isAdopted) {
      return res.status(409).send({
        success: false,
        message: "This pet has already been adopted",
      });
    }

    // ❌ Pending request exists
    if (pet.hasPending) {
      return res.status(409).send({
        success: false,
        message: "This pet already has a pending adoption request",
      });
    }

    // ❌ Same user duplicate request
    const existingUserRequest = await adoptionCollection.findOne({
      petId,
      userId,
    });

    if (existingUserRequest) {
      return res.status(409).send({
        success: false,
        message: "You already requested this pet",
      });
    }

    // ✅ Create request
    const newRequest = {
      petId,
      userId,
      userName,
      userEmail,
      pickupDate,
      message,
      status: "pending",
      createdAt: new Date(),
    };

    const result = await adoptionCollection.insertOne(newRequest);

    // ✅ Lock pet request system
    await petsCollection.updateOne(
      { _id: new ObjectId(petId) },
      {
        $set: {
          hasPending: true,
        },
      }
    );

    // ✅ Success response
    res.send({
      success: true,
      message: "Adoption request submitted successfully",
      insertedId: result.insertedId,
    });

  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to create adoption request",
      error: error.message,
    });
  }
});
app.get("/pets/:petId/adoption-requests", async (req, res) => {
  try {
    const { petId } = req.params;


    const pet = await petsCollection.findOne({
      _id: new ObjectId(petId),
    });

    if (!pet) {
      return res.status(404).send({
        success: false,
        message: "Pet not found",
      });
    }

  
    const requests = await adoptionCollection
      .find({ petId })
      .sort({ createdAt: -1 }) 
      .toArray();

    res.send({
      success: true,
      message: "Adoption requests fetched successfully",
      total: requests.length,
      data: requests,
    });

  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to fetch adoption requests",
      error: error.message,
    });
  }
});
    app.patch("/pets/:petId", async (req, res) => {
      const updatePet = req.body;

      const query = {
        _id: new ObjectId(req.params.petId),
      };

      const updatedDoc = {
        $set: {
          petName: updatePet.petName,
          species: updatePet.species,
          breed: updatePet.breed,
          age: parseInt(updatePet.age),
          gender: updatePet.gender,
          vaccinationStatus: updatePet.vaccinationStatus,
          imageUrl: updatePet.imageUrl,
          location: updatePet.location,
          adoptionFee: parseInt(updatePet.adoptionFee),
          ownerEmail: updatePet.ownerEmail,
          description: updatePet.description,
        },
      };

      const result = await petsCollection.updateOne(query, updatedDoc);

      res.send(result);
    });
    app.post("/pets", async (req, res) => {
      try {
        const newPet = req.body;

        const result = await petsCollection.insertOne(newPet);

        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Failed to insert pet" });
      }
    });
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Pranipremi is running......");
});

app.listen(port, () => {
  console.log(`Server running at ${port}`);
});
