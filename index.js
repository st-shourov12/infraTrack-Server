require('dotenv').config()
const express = require('express');
const cors = require('cors');
var admin = require("firebase-admin");
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET);
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const app = express();
// var serviceAccount = require('./infratrack_fb_sdk.json');
const { time } = require('console');



const decoded = Buffer.from(process.env.FB_SERVICE_KEY, 'base64').toString('utf8')
const serviceAccount = JSON.parse(decoded);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});




app.use(cors(
    {
    origin: ['http://localhost:5173', 'https://infratrackservice.netlify.app', 'https://infra-track.vercel.app'], 
    credentials: true
  }
));

app.use(express.json());

const verifyFBToken = async (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' })
  }

  try {
    const idToken = token.split(' ')[1];
    const decoded = await admin.auth().verifyIdToken(idToken);
    console.log('decoded in the token', decoded);
    req.decoded_email = decoded.email;
    next();
  }
  catch (err) {
    return res.status(401).send({ message: 'unauthorized access' })
  }


}




function generateTrackingId() {
  const prefix = "PRM"; // your brand prefix
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
  const random = crypto.randomBytes(3).toString("hex").toUpperCase(); // 6-char random hex

  return `${prefix}-${date}-${random}`;
}



const uri = process.env.DB_URI;

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
    await client.connect();

    const db = client.db('infratrackdb');
    const userCollection = db.collection('users');
    const issueCollection = db.collection('issues');
    const paymentCollection = db.collection('payments');
    const staffCollection = db.collection('staffs');


    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded_email;
      const query = { email };
      const user = await userCollection.findOne(query);


      if (!user || user.role !== 'admin') {
        return res.status(403).send({ message: 'forbidden access' })
      }
      next()

    }


    // staff api


    app.post('/staffs', verifyFBToken, async (req, res) => {
      const staffApplication = req.body;

      staffApplication.appliedAt = new Date();
      const email = staffApplication.email;

      const applicationExists = await staffCollection.find({ email }).toArray();

      if (applicationExists.length > 0) {
        return res.status(400).send({ message: 'Application already exists' });
      }
      const result = await staffCollection.insertOne(staffApplication);
      res.send(result);
    });

    app.get('/staffs', verifyFBToken, async (req, res) => {
      const query = {}
      const { email, applicationStatus } = req.query;
      if (applicationStatus) {
        query.applicationStatus = applicationStatus;
      }
      if (email) {
        query.email = email;
      }
      const options = { sort: { appliedAt: -1 } }

      const cursor = staffCollection.find(query, options);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.patch('/staffs/:id', verifyFBToken, async (req, res) => {
      const id = req.params.id;
      const updatedStaff = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: updatedStaff,
      };
      const result = await staffCollection.updateOne(filter, updateDoc);

      res.send(result);
    });
    app.delete('/staffs/:id', verifyFBToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await staffCollection.deleteOne(query)
      res.send(result)
    })

    // user api

    app.post('/create-user', verifyFBToken, verifyAdmin, async (req, res) => {

      const { email, password, role, displayName, profilePhoto } = req.body;

      try {

        const userRecord = await admin.auth().createUser({
          email,
          password,
          displayName,
        });


        const result = await userCollection.insertOne({
          uid: userRecord.uid,
          email,
          displayName,
          profilePhoto,
          role: 'staff' || role,
          createdAt: new Date(),
          isBlock: false,
          isPremium: false,
          isUpvote: true

        });

        res.send({
          success: true,
          uid: userRecord.uid,
          message: 'User created successfully',
        });

      } catch (error) {
        res.status(400).send({ message: error.message });
      }
    }
    );




    app.get('/users', verifyFBToken, async (req, res) => {
      // const searchText = req.query.searchText;
      const query = {};
      const { email } = req.query;
      if (email) {
        query.email = email;
      }



      const cursor = userCollection.find(query).sort({ createdAt: -1 });
      const result = await cursor.toArray();
      res.send(result);
    });


    app.post('/users', async (req, res) => {
      const user = req.body;

      user.createdAt = new Date();
      user.isPremium = false;
      user.isBlock = false;
      user.isUpvote = true;
      const email = user.email;

      const userExists = await userCollection.findOne({ email })

      if (userExists) {
        return res.send({ message: 'user exists' })
      }

      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.get('/users/:id', verifyFBToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.findOne(query);
      res.send(result);
    });

    app.get('/users/:email/role', verifyFBToken, async (req, res) => {
      const email = decodeURIComponent(req.params.email);
      const user = await userCollection.findOne({ email });

      if (!user) {
        return res.status(404).send({ role: null });
      }

      res.send({ role: user.role || 'user' });
    });


    app.patch('/users/:id', async (req, res) => {
      const id = req.params.id;
      const updatedUser = req.body;

      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: updatedUser,

      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });



    // issue api







    app.get('/issues', async (req, res) => {
      try {
        const { email, status, priority, category, region, district, upzila, role } = req.query;

        const query = {};

        if (email) query.reporterEmail = email;
        if (status) query.status = status;
        if (priority) query.priority = priority;
        if (category) query.category = category;
        if (region) query.region = region;
        if (district) query.district = district;
        if (upzila) query.upzila = upzila;
        if (role) query.userRole = role;
        // if (boosted !== undefined) query.boosted = boosted === 'true';

        if (status === 'closed') {
          query.closedAt = { $exists: true };
        }

        const pipeline = [
          {
            $match: query   // 
          },
          {
            $addFields: {
              priorityOrder: {
                $switch: {
                  branches: [
                    { case: { $eq: ['$priority', 'High'] }, then: 1 },
                    { case: { $eq: ['$priority', 'Medium'] }, then: 2 },
                    { case: { $eq: ['$priority', 'Low'] }, then: 3 },
                  ],
                  default: 4
                }
              },
              statusOrder: {
                $switch: {
                  branches: [
                    { case: { $eq: ['$status', 'pending'] }, then: 1 },
                    { case: { $eq: ['$status', 'in-progress'] }, then: 2 },
                    { case: { $eq: ['$status', 'resolved'] }, then: 3 },
                    { case: { $eq: ['$status', 'closed'] }, then: 4 },
                  ],
                  default: 5
                }
              }
            }
          },
          {
            $sort: {
              closedAt: -1, // for closed issues, sort by closedAt first
              priorityOrder: 1,  // High → Medium → Low
              statusOrder: 1,    // pending → closed
              createdAt: -1      // latest first
            }
          }
        ];

        const result = await issueCollection.aggregate(pipeline).toArray();
        res.send(result);

      } catch (error) {
        console.error(error);
        res.status(500).send({ message: 'Failed to fetch issues' });
      }
    });





    app.get('/issues/:id', verifyFBToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await issueCollection.findOne(query);
      res.send(result);
    });

    app.patch('/issues/:id', verifyFBToken, async (req, res) => {
      const id = req.params.id;
      const updatedIssue = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: updatedIssue,
      };
      const result = await issueCollection.updateOne(filter, updateDoc);
      res.send(result);
    });


    app.post('/issues', verifyFBToken, async (req, res) => {
      try {
        const issue = req.body;
        const email = req.decoded_email;

        const user = await userCollection.findOne({ email });
        if (!user) return res.status(404).send({ message: 'User not found' });

        if (user.isBlock) {
          return res.status(403).send({ message: 'You are blocked by admin' });
        }

        if (!user.isPremium && user.role === 'user') {
          const count = await issueCollection.countDocuments({ reporterEmail: email });
          if (count >= 3) {
            return res.status(403).send({
              message: 'You can post only 3 issues. Buy premium',
            });
          }
        }

        const issueData = {
          ...issue,
          reporterEmail: email,
          userRole: user.role,
          createdAt: new Date(),
          status: 'pending',
          boosted: false,
          upvoted: 0,
        };

        const result = await issueCollection.insertOne(issueData);
        res.send(result);

      } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Internal Server Error' });
      }
    });







    // app.get('/allIssue' , async (req, res ) =>{
    //   try{

    //     const {limit , skip } = req.query
    //     console.log(limit);

    //     const issues = await issueCollection.find().limit(Number(limit)).skip(Number(skip)).toArray()

    //     const count = await issueCollection.countDocuments()
    //     res.send({  issues , count})

    //   } catch (error) {
    //     res.status(500).send({ message: 'Internal Server Error'})
    //   }

    // })

    app.get('/payments', verifyFBToken, async (req, res) => {
      const query = {}
      const { email } = req.query;
      if (email) {
        query.userEmail = email;
        if (email !== req.decoded_email) {
          return res.status(403).send({ message: 'Forbidden Access' })
        }
      }
      const options = { sort: { createdAt: -1 } }

      const cursor = paymentCollection.find(query, options);
      const result = await cursor.toArray();
      res.send(result);
    }
    );
    app.get('/latestResolve', async (req, res) => {
      try {
        const { status } = req.query;

        if (!status) {
          return res.status(400).send({ message: 'status is required' });
        }

        if (status === 'closed') {
          const issues = await issueCollection
            .find({ status: 'closed' })
            .sort({ closedAt: -1 })
            .limit(6)
            .toArray();

          return res.send(issues);
        }

        res.send([]);
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Server error' });
      }
    });



    app.get('/allIsses', async (req, res) => {
      try {
        const {
          limit = 6,
          skip = 0,
          search = '',
          status = 'all',
          category = 'all',
          priority = 'all',

        } = req.query;

        if (status === 'all' && category === 'all' && priority === 'all' && !search) {
          const issues = await issueCollection
            .find()
            .skip(Number(skip))
            .limit(Number(limit))
            .sort({ createdAt: -1 })
            .toArray();

          const count = await issueCollection.countDocuments();
          return res.send({ issues, count });
        }

        let query = {};


        if (search) {
          query.$or = [
            { category: { $regex: search, $options: 'i' } },
            { location: { $regex: search, $options: 'i' } },
            { district: { $regex: search, $options: 'i' } },
            { upzila: { $regex: search, $options: 'i' } },
            { region: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
          ];
        }


        if (status !== 'all') query.status = status;
        if (category !== 'all') query.category = category;
        if (priority !== 'all') query.priority = priority;

        const issues = await issueCollection
          .find(query)
          .skip(Number(skip))
          .limit(Number(limit))
          .sort({ createdAt: -1 })
          .toArray();

        const count = await issueCollection.countDocuments(query);

        res.send({ issues, count });
      } catch (error) {
        res.status(500).send({ message: 'Internal Server Error' });
      }
    });


    app.get('/allIssues', async (req, res) => {
      try {
        const {
          limit = 6,
          skip = 0,
          search = '',
          status = 'all',
          category = 'all',
          priority = 'all',
          sorting = 1 ? 1 : -1,
        } = req.query;





        const matchStage = {};


        if (search) {
          matchStage.$or = [
            { category: { $regex: search, $options: 'i' } },
            { location: { $regex: search, $options: 'i' } },
            { district: { $regex: search, $options: 'i' } },
            { upzila: { $regex: search, $options: 'i' } },
            { region: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
          ];
        }


        if (status !== 'all') matchStage.status = status;
        if (category !== 'all') matchStage.category = category;
        if (priority !== 'all') matchStage.priority = priority;

        const pipeline = [
          {
            $match: matchStage
          },
          {

            $addFields: {
              priorityOrder: {
                $switch: {
                  branches: [
                    { case: { $eq: ['$priority', 'High'] }, then: 1 },
                    { case: { $eq: ['$priority', 'Medium'] }, then: 2 },
                    { case: { $eq: ['$priority', 'Low'] }, then: 3 }
                  ],
                  default: 4
                }
              },
              statusOrder: {
                $switch: {
                  branches: [
                    { case: { $eq: ['$status', 'pending'] }, then: 1 },
                    { case: { $eq: ['$status', 'in-progress'] }, then: 2 },
                    { case: { $eq: ['$status', 'rejected'] }, then: 3 },
                    { case: { $eq: ['$status', 'resolved'] }, then: 4 },
                    { case: { $eq: ['$status', 'closed'] }, then: 5 },
                  ],
                  default: 6
                }
              }
            }
          },
          {

            $sort: {
              priorityOrder: 1,
              statusOrder: Number(sorting),
              createdAt: -1
            }
          },
          {
            //  pagination
            $skip: Number(skip)
          },
          {
            $limit: Number(limit)
          }
        ];

        // if (status === 'all' && category === 'all' && priority === 'all' && !search) {
        //   const issues = await issueCollection.aggregate(pipeline).toArray();

        //   const count = await issueCollection.countDocuments();
        //   return res.send({ issues, count });
        // }

        const issues = await issueCollection.aggregate(pipeline).toArray();
        const count = await issueCollection.countDocuments(matchStage);

        res.send({ issues, count });

      } catch (error) {
        console.error(error);
        res.status(500).send({ message: 'Internal Server Error' });
      }
    });





    // app.post('/issues', async (req, res) => {
    //   const issue = req.body;

    //   // safety check
    //   if (!issue?.reporterEmail || !issue?.userRole) {
    //     return res.status(400).send({ message: 'Invalid issue data' });
    //   }

    //   // only limit normal users

    //     const userIssueCount = await issueCollection.countDocuments({
    //       reporterEmail: issue.reporterEmail,
    //     });

    //     if (userIssueCount >= 3) {
    //       return res.status(403).send({
    //         message: 'You can post only 3 issues. Buy premium'
    //       });
    //     }


    //   else {
    //     issue.createdAt = new Date();

    //     const result = await issueCollection.insertOne(issue);
    //     res.send(result);
    //   }


    // });

    app.delete('/issues/:id', verifyFBToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }

      const result = await issueCollection.deleteOne(query)
      res.send(result)
    })




    // Payment API

    // get payment api using email query and also get by default all payments sorted by date

    app.get('/payments', verifyFBToken, async (req, res) => {
      const query = {}
      const { email } = req.query;
      if (email) {
        query.userEmail = email;
        if (email !== req.decoded_email) {
          return res.status(403).send({ message: 'Forbidden Access' })
        }
      }
      const options = { sort: { createdAt: -1 } }

      const cursor = paymentCollection.find(query, options);
      const result = await cursor.toArray();
      res.send(result);
    }
    );



    app.post('/payment-checkout-session', async (req, res) => {
      const paymentInfo = req.body;
      const amount = parseInt(paymentInfo.cost * 100);
      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            // Provide the exact Price ID (for example, price_1234) of the product you want to sell
            price_data: {
              currency: 'bdt',
              product_data: {
                name: `Please buy subscription ${paymentInfo.userName}`,
                description: 'Get unlimited issue reporting and premium support with InfraTrack Premium Membership.',
              },
              unit_amount: amount,
            },
            quantity: 1,
          },
        ],
        customer_email: paymentInfo.userEmail,
        mode: 'payment',
        metadata: {
          userId: paymentInfo.userId,
          userEmail: paymentInfo.userEmail,
          userName: paymentInfo.userName,
          photo: paymentInfo.photo,
          issueId: paymentInfo.issueId || null,

        },
        success_url: `${process.env.SITE_DOMAIN}/dashboard/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.SITE_DOMAIN}/dashboard/payment-cancelled`,
      });
      console.log(session);
      res.send({ url: session.url })

    })



    // old
    app.post('/create-checkout-session', async (req, res) => {

      const paymentInfo = req.body;
      const amount = parseInt(paymentInfo.cost * 100);
      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            // Provide the exact Price ID (for example, price_1234) of the product you want to sell
            price_data: {
              currency: 'bdt',
              product_data: {
                name: 'InfraTrack Premium Membership',
                description: 'Get unlimited issue reporting and premium support with InfraTrack Premium Membership.',
              },
              unit_amount: amount,
            },
            quantity: 1,
          },
        ],
        customer_email: paymentInfo.userEmail,
        mode: 'payment',
        metadata: {
          userId: paymentInfo.userId,
          userEmail: paymentInfo.userEmail,
          userName: paymentInfo.userName,
          photo: paymentInfo.photo,
          issueId: paymentInfo.issueId || '',

        },
        success_url: `${process.env.SITE_DOMAIN}/dashboard/payment-success`,
        cancel_url: `${process.env.SITE_DOMAIN}/dashboard/payment-cancelled`,
      });
      console.log(session);
      res.send({ url: session.url })
      // res.send({
      //   clientSecret: paymentIntent.client_secret,
      // });
    });



    app.patch('/payment-success', async (req, res) => {
      try {
        const sessionId = req.query.session_id;
        if (!sessionId) {
          return res.status(400).send({ message: 'Session ID required' });
        }


        const existingPayment = await paymentCollection.findOne({ sessionId });
        if (existingPayment) {
          return res.send({
            paymentId: existingPayment._id,
            transactionId: existingPayment.transactionId,
            trackingId: existingPayment.trackingId,
          });
        }


        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (!session?.metadata?.userId) {
          return res.status(400).send({ message: 'Invalid session metadata' });
        }

        const amount = session.amount_total / 100;


        const paymentRecord = {
          sessionId,
          userId: session.metadata.userId,
          userEmail: session.customer_email,
          userName: session.metadata.userName,
          amount,
          transactionId: session.payment_intent,
          trackingId: generateTrackingId(),
          invoiceId: `INV-${Date.now()}`,
          createdAt: new Date(),
        };

        const result = await paymentCollection.insertOne(paymentRecord);


        if (amount === 1000) {
          await userCollection.updateOne(
            { _id: new ObjectId(session.metadata.userId) },
            { $set: { isPremium: true } }
          );
        }


        if (amount === 100 && session.metadata.issueId) {
          await issueCollection.updateOne(
            { _id: new ObjectId(session.metadata.issueId) },
            {
              $set: {
                priority: "High",
                boosted: true,
              },
              $push: {
                timeline: {
                  $each: [
                    {
                      id: 3,
                      status: "boost",
                      message: "Issue priority boosted to High through payment (৳100)",
                      updatedBy: session.customer_email,
                      role: "user",
                      date: new Date().toISOString(),
                    }
                  ],
                  $position: 0
                }
              }
            }
          );
        }

        // Response
        res.send({
          sessionId,
          paymentId: result.insertedId,
          transactionId: paymentRecord.transactionId,
          trackingId: paymentRecord.trackingId,
        });

      } catch (error) {
        console.error('Payment Success Error:', error);
        res.status(500).send({ message: 'Internal Server Error' });
      }
    });


    app.patch('/payment-succe', async (req, res) => {
      const sessionId = req.query.session_id;
      if (!sessionId) return res.status(400).send({ message: 'Session ID required' });

      // duplicate prevent
      const existingPayment = await paymentCollection.findOne({ sessionId });
      if (existingPayment) {
        return res.send({
          paymentId: existingPayment._id,
          transactionId: existingPayment.transactionId,
          trackingId: existingPayment.trackingId,
        });
      }

      const session = await stripe.checkout.sessions.retrieve(sessionId);

      const paymentRecord = {
        sessionId: sessionId,
        userId: session.metadata.userId,
        userEmail: session.customer_email,
        userName: session.metadata.userName,
        amount: session.amount_total / 100,
        transactionId: session.payment_intent,
        trackingId: generateTrackingId(),
        invoiceId: `INV-${Date.now()}`,
        createdAt: new Date(),
      };

      const result = await paymentCollection.insertOne(paymentRecord);

      if (session.amount_total / 100 === 1000) {

        await userCollection.updateOne(
          { _id: new ObjectId(session.metadata.userId) },
          { $set: { isPremium: true } }
        );
      } else if (session.amount_total / 100 === 100) {

        //   await issueCollection.updateOne(
        //     { _id: new ObjectId(session.metadata.issueId) },
        //     {
        //       $set:
        //       {

        //         priority: "High",
        //         boosted: true,
        //         timeline: [
        //           {
        //             id: 3,
        //             status: "boost",
        //             message: "Issue priority boosted to High through payment (৳100)",
        //             updatedBy: `${session.customer_email}`,
        //             role: "user",
        //             date: new Date().toISOString()
        //           },
        //           ...issue.timeline
        //         ]
        //       }
        //     }
        //   );
        // }
        await issueCollection.updateOne(
          { _id: new ObjectId(session.metadata.issueId) },
          {
            $set: {
              priority: "High",
              boosted: true
            },
            $push: {
              timeline: {
                $each: [
                  {
                    id: 3,
                    status: "boost",
                    message: "Issue priority boosted to High through payment (৳100)",
                    updatedBy: session.customer_email,
                    role: "user",
                    date: new Date().toISOString()
                  }
                ],
                $position: 0
              }
            }
          }
        );
      }



      res.send({
        sessionId: paymentRecord.sessionId,
        paymentId: result.insertedId,
        transactionId: paymentRecord.transactionId,
        trackingId: paymentRecord.trackingId,
      });
    });



    // app.patch('/payment-success', async (req, res) => {
    // const { userId, userEmail, userName, photo, amount, transactionId } = req.body;
    // const paymentRecord = {
    //   userId,
    //   userEmail,
    //   userName, 
    //   photo,
    //   amount,
    //   transactionId,
    //   createdAt: new Date(),
    // };  
    // const result = await paymentCollection.insertOne(paymentRecord);
    //   // update user to premium
    //   const filter = { _id: new ObjectId(userId) };
    //   const updateDoc = { 
    //     $set: { isPremium: true },
    //   };
    //   const userUpdateResult =  await userCollection.updateOne(filter, updateDoc);
    //   res.send({result, userUpdateResult});
    // });



    app.get('/invoice/:paymentId', async (req, res) => {
      try {
        const paymentId = req.params.paymentId;

        const payment = await paymentCollection.findOne({
          _id: new ObjectId(paymentId),
        });

        if (!payment) {
          return res.status(404).send({ message: 'Invoice not found' });
        }

        const doc = new PDFDocument({ size: 'A4', margin: 50 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename=${payment.invoiceId}.pdf`
        );

        doc.pipe(res);

        // Header
        doc.fontSize(22).text('InfraTrack Invoice', { align: 'center' });
        doc.moveDown();

        doc.fontSize(12)
          .text(`Invoice ID: ${payment.invoiceId}`)
          .text(`Transaction ID: ${payment.transactionId}`)
          .text(`Tracking ID: ${payment.trackingId}`)
          .text(`Date: ${new Date(payment.createdAt).toDateString()}`);

        doc.moveDown();

        // Customer
        doc.fontSize(14).text('Billed To:');
        doc.fontSize(12)
          .text(payment.userName)
          .text(payment.userEmail);

        doc.moveDown();

        // Payment Info
        doc.fontSize(14).text('Payment Details');
        doc.fontSize(12)
          .text('Description: InfraTrack Premium Membership')
          .text(`Amount Paid: $${payment.amount}`);

        doc.moveDown(2);
        doc.text('Thank you for using InfraTrack!', { align: 'center' });

        doc.end();
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Failed to generate invoice' });
      }
    });




    // Send a ping to confirm a successful connection
    // // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('InfraTrack is running!')
})


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
