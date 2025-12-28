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
var serviceAccount = require('./infratrack_fb_sdk.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});




app.use(cors({
  origin: 'http://localhost:5173',  // your React/Vite dev server
  credentials: true
}));

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

// const verifyAdmin =







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


    // staff api


    app.post('/staffs', async (req, res) => {
      const staffApplication = req.body;
      staffApplication.applicationStatus = 'pending';
      staffApplication.appliedAt = new Date();
      const email = staffApplication.email;

      const applicationExists = await staffCollection.find
        ({ email }).toArray();

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
      // if(req.body.applicationStatus === 'approved'){
      //   const email = updatedStaff.email;
      //   const userQuery = { email: email };
      //   const updateUser = {
      //     $set : {
      //       role: 'staff'
      //     }
      //   }
      //     await userCollection.updateOne(userQuery, updateUser);
      //   } 


      res.send(result);
    });
    app.delete('/staffs/:id', verifyFBToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await staffCollection.deleteOne(query)
      res.send(result)
    })

    // user api

    app.post('/create-user', verifyFBToken, async (req, res) => {

      const { email, password, role, displayName } = req.body;

      try {

        const userRecord = await admin.auth().createUser({
          email,
          password,
          displayName,
        });


        await userCollection.insertOne({
          uid: userRecord.uid,
          email,
          displayName,
          role: role || 'user',
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
      const searchText = req.query.searchText;
      const query = {};
      const { email } = req.query;
      if (email) {
        query.email = email;
      }

      if (searchText) {
        // query.displayName = {$regex: searchText, $options: 'i'}

        query.$or = [
          { displayName: { $regex: searchText, $options: 'i' } },
          { email: { $regex: searchText, $options: 'i' } },
        ]

      }

      const cursor = userCollection.find(query).sort({ createdAt: -1 }).limit(5);
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
    // app.get('/users/:email/role', verifyFBToken, async (req, res) => {
    //   const email = req.params.email;
    //   const query = { email: email };
    //   const result = await userCollection.findOne(query);
    //   res.send({role: result?.role });
    // });

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
      const query = {}
      const { email } = req.query;

      // /parcels?email=''&
      if (email) {
        query.reporterEmail = email;


      }



      const options = { sort: { createdAt: -1 } }

      const cursor = issueCollection.find(query, options);
      const result = await cursor.toArray();
      res.send(result);
    })

    // app.get('/issues', async (req, res) => {
    //   const { email } = req.query;

    //   const matchStage = {};
    //   if (email) {
    //     matchStage.reporterEmail = email;
    //   }

    //   const pipeline = [
    //     { $match: matchStage },

    //     // timeline length add করা
    //     {
    //       $addFields: {
    //         timelineCount: { $size: { $ifNull: ['$timeline', []] } }
    //       }
    //     },

    //     // sort by createdAt + timelineCount
    //     {
    //       $sort: {

    //         timelineCount: -1,
    //         createdAt: -1

    //       }
    //     }
    //   ];

    //   const result = await issueCollection.aggregate(pipeline).toArray();
    //   res.send(result);
    // });


    app.get('/issues/:id', async (req, res) => {
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


    app.post('/issues',  async (req, res) => {
      try {
        const issue = req.body;

        
        const email = issue.reporterEmail;

      
        const user = await userCollection.findOne({ email });

        if (!user) {
          return res.status(404).send({ message: 'User not found' });
        }

        //  Blocked user
        if (user.isBlock) {   
          return res.status(403).send({ message: 'You are blocked by admin' });
        }

        // const xrole = user.role === 'user' || user.role === 'staff'

        // console.log(xrole , 'sssss');

        // Normal user limitation (NOT premium)
        if (!user.isPremium && user.role === 'user') {
          const userIssueCount = await issueCollection.countDocuments({
            reporterEmail: email,
          });

          if (userIssueCount >= 3) {
            return res.status(403).send({
              message: 'You can post only 3 issues. Buy premium',
            });
          }
        }

        
        const issueData = {
          ...issue,                    // non-critical fields
          reporterEmail: email,       
          userRole: user.role,        
          createdAt: new Date(),
          boosted: false,
          upvoted: 0,
          upvotedBy: null,
          status: 'pending',
        };

        const result = await issueCollection.insertOne(issueData);
        res.send(result);

      } catch (err) {
        console.error(err);
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

    app.delete('/issues/:id', async (req, res) => {
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

    // app.patch('/payment-success', async (req, res) => {
    //   const sessionId = req.query.session_id;

    //   if (!sessionId) {
    //     return res.status(400).send({ message: 'Session ID required' });
    //   }

    //   //  already exists?
    //   const existingPayment = await paymentCollection.findOne({ sessionId });
    //   if (existingPayment) {
    //     return res.send({ message: 'Payment already recorded' });
    //   }

    //   const session = await stripe.checkout.sessions.retrieve(
    //     sessionId,
    //     { expand: ['invoice'] }
    //   );

    //   const paymentRecord = {
    //     sessionId,
    //     userId: session.metadata.userId,
    //     userEmail: session.customer_email,
    //     userName: session.metadata.userName,
    //     amount: session.amount_total / 100,
    //     transactionId: session.payment_intent,
    //     invoicePdf: session.invoice?.invoice_pdf,
    //     createdAt: new Date(),
    //   };

    //   await paymentCollection.insertOne(paymentRecord);

    //   await userCollection.updateOne(
    //     { _id: new ObjectId(session.metadata.userId) },
    //     { $set: { isPremium: true, role: 'premium-citizen' } }
    //   );

    //   res.send({ success: true });
    // });



    // app.patch('/payment-success', async (req, res) => {
    //   const sessionId = req.query.session_id;

    //   if (!sessionId) {
    //     return res.status(400).send({ message: 'Session ID is required' });
    //   } 
    //   const session = await stripe.checkout.sessions.retrieve(sessionId);


    //   const id = session.metadata.userId;
    //   // const { userId, userEmail, userName, photo, amount, transactionId } = req.body;
    //   const paymentRecord = {
    //     sessionId: sessionId,
    //     userId: session.metadata.userId,
    //     userEmail: session.customer_email,
    //     userName: session.metadata.userName, 
    //     photo: session.metadata.photo,
    //     amount: session.amount_total / 100,
    //     transactionId : session.payment_intent,
    //     premiumCreatedAt: new Date(),
    //   };  
    //   const result = await paymentCollection.insertOne(paymentRecord);
    //   res.send({success: true, paymentInfo: result});
    //   // update user to premium


    //   const filter = { _id: new ObjectId(id) };
    //   const updateDoc = { 
    //     $set: {   
    //       role: 'premium-citizen',
    //       isPremium: true ,
    //       premiumSince: new Date()
    //     },
    //   };
    //   const userUpdateResult =  await userCollection.updateOne(filter, updateDoc);
    //   res.send({ userUpdateResult });
    // });

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

        // ✅ Response
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
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
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
