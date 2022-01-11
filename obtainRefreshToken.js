const SpotifyWebApi = require('spotify-web-api-node');
const http = require('http');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

let spotifyApi = new SpotifyWebApi({
    clientId: config.clientId,
    redirectUri: 'http://localhost:8888/callback'
});

const authUrl = spotifyApi.createAuthorizeURL(['playlist-modify-private', 'playlist-read-private'], 'this-is-the-state');

spotifyApi = new SpotifyWebApi({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    redirectUri: 'http://localhost:8888/callback'
});

const server = http.createServer((req, res) => {
    const splitAtState = req.url.split('&state=');
    if (splitAtState[1] === 'this-is-the-state') {
        const code = splitAtState[0].split('?code=')[1];
        if (code) {
            spotifyApi.authorizationCodeGrant(code).then(data => {
                const message = 'The refresh token is ' + data.body['refresh_token'];

                console.log(message);
                res.end(message);
                server.close();
            });
        } else {
            res.end('no code found');
        }
    } else {
        res.end('invalid or no state found');
    }
}).listen(8888);

console.log(authUrl);
