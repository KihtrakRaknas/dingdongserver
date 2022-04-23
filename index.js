require('dotenv').config()
const fetch = require('node-fetch')
const express = require('express')
var cors = require('cors');
const app = express()
app.use(express.json());
app.use(cors());
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

    fetch(`https://n.kihtrak.com/?project=${process.env.NOTIBOTPROJECT}&title=${name} (${fingerprint}) at door!&body=${message ? message : 'No message'}&webhook=${process.env.DOOROPENHOOK}`).then(() => {
        fingerprints[fingerprint] = new Date().getTime() + 1000 * 60 * 2
        res.json({ timeout: fingerprints[fingerprint], success: true, message: "" })
    })

})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})