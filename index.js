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

app.post('/', async (req, res) => {
    const { fingerprint, name, message, token } = req.body

    if(!fingerprint || isNaN(fingerprint))
        return res.json({ 
            success: false, 
            message: `Invalid fingerprint: ${fingerprint}` 
        })
    
    if (fingerprints[fingerprint] && new Date().getTime() - fingerprints[fingerprint] < 0)
        return res.json({ 
            timeout: fingerprints[fingerprint], 
            success: false, 
            message: `You rang the bell twice within 2 minutes...` 
        })

    if (!token)
        return res.json({ 
            success: false, 
            message: `No Captcha token provided` 
        })
    
    // Add a 10 second timeout to prevent spam while the database lookup is occuring
    fingerprints[fingerprint] = new Date().getTime() + 1000 * 10

    const googleResponse = await fetch(`https://www.google.com/recaptcha/api/siteverify?secret=${process.env.CAPTCHASECRETKEY}&response=${token}`, {
        method: 'post',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            secret: process.env.CAPTCHASECRETKEY,
            response: token
        })
    })
    .then(response => response.json())
    .catch(() => ({success: true, score:1}));

    // Logging for fun
    console.log({...req.body,...googleResponse})

    if(googleResponse.success == false){
        const errMsg = googleResponse?.["error-codes"]?.join('\n') || ""
        return res.json({ 
            timeout: fingerprints[fingerprint], 
            success: false, 
            message: `Failed reCAPTCHA validation: \n${errMsg}` 
        })
    }

    if(googleResponse.score < 0.5){
        return res.json({ 
            timeout: fingerprints[fingerprint], 
            success: false, 
            message: `You only have a ${googleResponse.score*100}% chance of being human.\nTry not being a bot 🤷‍♂️` 
        })
    }

    const nameEnc = encodeURIComponent(name)
    const messageEnc = encodeURIComponent(message)
    db.ref(""+fingerprint).once("value", function(snapshot) {
        const val = snapshot.val()
        returnFinger = fingerprint
        if(val)
            returnFinger = val.name
        else{
            fetch(`https://n.kihtrak.com/?project=${process.env.NOTIBOTPROJECT}&title=Unknown Fingerprint (${fingerprint})&body=User input name: ${nameEnc}&webhook=${encodeURIComponent(`https://dingdongapi.kihtrak.com/assignFingerprint?code=${process.env.SECRETCODE}&fingerprint=${fingerprint}&name=`)}&webhookParam=true`)
        }
        fetch(`https://n.kihtrak.com/?project=${process.env.NOTIBOTPROJECT}&title=🔔 ${nameEnc} (${returnFinger}) 🔔&body=${message ? messageEnc : 'No message'}&webhook=${process.env.DOOROPENHOOK}`).then(() => {
            fingerprints[fingerprint] = new Date().getTime() + 1000 * 60 * 2
            res.json({ timeout: fingerprints[fingerprint], success: true, message: "" })
        })
    }, (errorObject) => {
        console.log('The read failed: ' + errorObject.name);
        fetch(`https://n.kihtrak.com/?project=${process.env.NOTIBOTPROJECT}&title=🔔 ${nameEnc} (${fingerprint}) 🔔&body=${message ? messageEnc : 'No message'}&webhook=${process.env.DOOROPENHOOK}`).then(() => {
            fingerprints[fingerprint] = new Date().getTime() + 1000 * 60 * 2
            res.json({ timeout: fingerprints[fingerprint], success: true, message: "" })
        })
    }); 
})

app.get('/assignFingerprint', (req, res) => {
    const { code, fingerprint, name } = req.query
    if(code == process.env.SECRETCODE){
        db.ref(""+fingerprint).update({name})
        return res.send("Updated successfully")
    }
    res.send("Invalid code")
})

app.get('/alive', (req, res) => {
    res.send("Server Alive")
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
