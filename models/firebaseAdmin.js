const admin = require("firebase-admin");
const path = require("path");

// Load your service account key
const serviceAccount = require(path.join(
  __dirname,
  "../certs/firebase-service-account.json"
));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
