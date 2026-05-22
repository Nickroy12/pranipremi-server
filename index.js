const express = require("express");
const app = express();

const dotenv = require("dotenv");
const cors = require("cors");

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");

dotenv.config();

const port = process.env.PORT || 5000;
const uri = process.env.MONGODB_URL;

// middleware
app.use(cors());
app.use(express.json());

// mongodb client
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
const jwks = createRemoteJWKSet(
  new URL(`http://localhost:3000/api/auth/jwks`)
) 
const verifyToken = async(req , res , next )=>{
      const header = req.headers.authorization
       if(!header){
        return res.status(401).json({
          message: "Unauthorized"
        })
       }
       const token = header.split(' ')[1]
      if(!token){
        return res.status(401).json({
          message: "Unauthorized"
        })
       }
       console.log(token);
      try {
          const [payload] = await jwtVerify(token , jwks)
       console.log(payload);
       next()
      } catch (error) {
       return res.status(403).json({
          message: "Forbidden"
        })
      }
      
      
    }

async function run() {
  try {
    // await client.connect();

    const db = client.db("pranipremidb");

    const petsCollection = db.collection("petsinfo");
    const adoptionCollection = db.collection("adoptionRequests");

    // ===============================
    // GET ALL PETS
    // ===============================
    app.get("/pets", async (req, res) => {
      try {
        const { name, species } = req.query;

        let query = {};

        // search by pet name
        if (name) {
          query.petName = {
            $regex: name,
            $options: "i",
          };
        }

        // filter by species
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
        console.error(error);

        res.status(500).send({
          success: false,
          message: "Failed to fetch pets",
          error: error.message,
        });
      }
    });
    app.get("/adoption-requests", async (req, res) => {
  try {
    const { status, userId, ownerId } = req.query;

    let query = {};

    // filter by status
    if (status) {
      query.status = status;
    }

    // filter by requester
    if (userId) {
      query.userId = userId;
    }

    // filter by pet owner
    if (ownerId) {
      query.ownerId = ownerId;
    }

    const requests = await adoptionCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    res.send({
      success: true,
      total: requests.length,
      requests,
    });

  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to fetch adoption requests",
      error: error.message,
    });
  }
});

    app.get("/pets/:petId",   async (req, res) => {
      try {
        const { petId } = req.params;

        // validate object id
        if (!ObjectId.isValid(petId)) {
          return res.status(400).send({
            success: false,
            message: "Invalid pet ID",
          });
        }

        const pet = await petsCollection.findOne({
          _id: new ObjectId(petId),
        });

        if (!pet) {
          return res.status(404).send({
            success: false,
            message: "Pet not found",
          });
        }

        res.send({
          success: true,
          pet,
        });
      } catch (error) {
        console.error(error);

        res.status(500).send({
          success: false,
          message: "Failed to fetch pet",
          error: error.message,
        });
      }
    });

    app.post("/pets", async (req, res) => {
      try {
        const newPet = req.body;

        const result = await petsCollection.insertOne(newPet);

        res.send({
          success: true,
          message: "Pet added successfully",
          insertedId: result.insertedId,
        });
      } catch (error) {
        console.error(error);

        res.status(500).send({
          success: false,
          message: "Failed to insert pet",
          error: error.message,
        });
      }
    });


    app.patch("/pets/:petId", async (req, res) => {
      try {
        const { petId } = req.params;

        if (!ObjectId.isValid(petId)) {
          return res.status(400).send({
            success: false,
            message: "Invalid pet ID",
          });
        }

        const updatePet = req.body;

        const query = {
          _id: new ObjectId(petId),
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

        const result = await petsCollection.updateOne(
          query,
          updatedDoc,
        );

        res.send({
          success: true,
          message: "Pet updated successfully",
          result,
        });
      } catch (error) {
        console.error(error);

        res.status(500).send({
          success: false,
          message: "Failed to update pet",
          error: error.message,
        });
      }
    });


    app.delete("/pets/:petId" , async (req, res) => {
      try {
        const { petId } = req.params;

        if (!ObjectId.isValid(petId)) {
          return res.status(400).send({
            success: false,
            message: "Invalid pet ID",
          });
        }

        const result = await petsCollection.deleteOne({
          _id: new ObjectId(petId),
        });

        res.send({
          success: true,
          message: "Pet deleted successfully",
          result,
        });
      } catch (error) {
        console.error(error);

        res.status(500).send({
          success: false,
          message: "Failed to delete pet",
          error: error.message,
        });
      }
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

    // ✅ Validation
    if (!userId || !pickupDate || !message) {
      return res.status(400).send({
        success: false,
        message: "Missing required fields",
      });
    }

    // ✅ Check valid ObjectId
    if (!ObjectId.isValid(petId)) {
      return res.status(400).send({
        success: false,
        message: "Invalid pet id",
      });
    }

    // ✅ Find pet
    const pet = await petsCollection.findOne({
      _id: new ObjectId(petId),
    });

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
        message: "This pet is already adopted",
      });
    }

    // ❌ Only ONE request per pet (main rule)
    const existingRequest = await adoptionCollection.findOne({
      petId,
      status: "pending",
    });

    if (existingRequest) {
      return res.status(409).send({
        success: false,
        message: "This pet already has an adoption request",
      });
    }

    // ❌ Same user duplicate check
    const userRequest = await adoptionCollection.findOne({
      petId,
      userId,
    });

    if (userRequest) {
      return res.status(409).send({
        success: false,
        message: "You already requested this pet",
      });
    }

    // ✅ Create request
    const newRequest = {
      petId,
      petName: pet.petName,
      petImage: pet.petImage,

      ownerId: pet.ownerId,

      userId,
      userName,
      userEmail,

      pickupDate,
      message,

      status: "pending",
      createdAt: new Date(),
    };

    const result = await adoptionCollection.insertOne(newRequest);

    res.status(201).send({
      success: true,
      message: "Adoption request submitted",
      insertedId: result.insertedId,
    });

  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

app.patch("/adoption-requests/:requestId", async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body;

    const allowedStatus = ["approved", "rejected"];

    if (!allowedStatus.includes(status)) {
      return res.status(400).send({
        success: false,
        message: "Invalid status",
      });
    }

    if (!ObjectId.isValid(requestId)) {
      return res.status(400).send({
        success: false,
        message: "Invalid request ID",
      });
    }

    const request = await adoptionCollection.findOne({
      _id: new ObjectId(requestId),
    });

    if (!request) {
      return res.status(404).send({
        success: false,
        message: "Request not found",
      });
    }

    if (request.status !== "pending") {
      return res.status(409).send({
        success: false,
        message: "Request already processed",
      });
    }

    if (status === "approved") {
      await adoptionCollection.updateOne(
        { _id: new ObjectId(requestId) },
        {
          $set: {
            status: "approved",
            updatedAt: new Date(),
          },
        }
      );

      await adoptionCollection.updateMany(
        {
          petId: request.petId,
          _id: { $ne: new ObjectId(requestId) },
          status: "pending",
        },
        {
          $set: {
            status: "rejected",
            updatedAt: new Date(),
          },
        }
      );

      await petsCollection.updateOne(
        { _id: new ObjectId(request.petId) },
        {
          $set: {
            isAdopted: true,
            adoptedBy: request.userId,
            adoptedAt: new Date(),
          },
        }
      );

      return res.send({
        success: true,
        message: "Adoption request approved",
      });
    }

    if (status === "rejected") {
      await adoptionCollection.updateOne(
        { _id: new ObjectId(requestId) },
        {
          $set: {
            status: "rejected",
            updatedAt: new Date(),
          },
        }
      );

      return res.send({
        success: true,
        message: "Adoption request rejected",
      });
    }
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to update request",
      error: error.message,
    });
  }
});
app.get("/pets/:petId/adoption-requests", async (req, res) => {
  const { petId } = req.params;
  const { status } = req.query;

  try {
    if (!ObjectId.isValid(petId)) {
      return res.status(400).send({
        success: false,
        message: "Invalid pet ID",
      });
    }

    // pet check
    const pet = await petsCollection.findOne({
      _id: new ObjectId(petId),
    });

    if (!pet) {
      return res.status(404).send({
        success: false,
        message: "Pet not found",
      });
    }

    // query build
    const query = { petId };

    // status filter
    if (status) {
      query.status = status;
    }

    const requests = await adoptionCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    res.send(
      
     
      requests
    );
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to fetch adoption requests",
      error: error.message,
    });
  }
});
    console.log(
      "Pinged your deployment. Successfully connected to MongoDB!",
    );
  } finally {
    // keep server alive
  }
}

run().catch(console.dir);

// root route
app.get("/", (req, res) => {
  res.send("Pranipremi is running...");
});

// server
app.listen(port, () => {
  console.log(`Server running at ${port}`);
});