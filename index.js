require('dotenv').config()
const fetch = require('node-fetch')
const express = require('express')
var cors = require('cors');
const app = express()
app.use(express.json());
app.use(cors());
const admin = require("firebase-admin");
admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASECONFIG)),
    databaseURL: "https://ding-dong-server-default-rtdb.firebaseio.com"
});
const db = admin.database();
const port = process.env.PORT || 3000

fingerprints = {}

app.post('/', (req, res) => {
    const { fingerprint, name, message } = req.body
    if (!fingerprint || (fingerprints[fingerprint] && new Date().getTime() - fingerprints[fingerprint] < 0))
        return res.json({ 
            timeout: fingerprints[fingerprint], 
            success: false, 
            message: `You rang the bell twice within 2 minutes...` 
        })

    db.ref(fingerprint).once("value", function(snapshot) {
        const val = snapshot.val()
        returnFinger = fingerprint
        if(val)
            returnFinger = val.name
        else{
            fetch(`https://n.kihtrak.com/?project=${process.env.NOTIBOTPROJECT}&title=Unknown Fingerprint (${name})&body=Fingerprint: ${fingerprint}&webhook=${encodeURIComponent(`https://ding-dong-server.herokuapp.com/assignFingerprint?code=${process.env.SECRETCODE}&fingerprint=${fingerprint}&name=`)}&webhookParam=true`)
        }
        fetch(`https://n.kihtrak.com/?project=${process.env.NOTIBOTPROJECT}&title=🔔 ${name} (${returnFinger}) 🔔&body=${message ? message : 'No message'}&webhook=${process.env.DOOROPENHOOK}`).then(() => {
            fingerprints[fingerprint] = new Date().getTime() + 1000 * 60 * 2
            res.json({ timeout: fingerprints[fingerprint], success: true, message: "" })
        })
    }, (errorObject) => {
        console.log('The read failed: ' + errorObject.name);
        fetch(`https://n.kihtrak.com/?project=${process.env.NOTIBOTPROJECT}&title=🔔 ${name} (${fingerprint}) 🔔&body=${message ? message : 'No message'}&webhook=${process.env.DOOROPENHOOK}`).then(() => {
            fingerprints[fingerprint] = new Date().getTime() + 1000 * 60 * 2
            res.json({ timeout: fingerprints[fingerprint], success: true, message: "" })
        })
    }); 
})

app.get('/assignFingerprint', (req, res) => {
    const { code, fingerprint, name } = req.query
    if(code == process.env.SECRETCODE){
        db.ref(fingerprint).update({name})
        return res.send("Updated successfully")
    }
    res.send("Invalid code")
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
