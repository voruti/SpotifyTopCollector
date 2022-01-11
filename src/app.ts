import SpotifyWebApi = require("spotify-web-api-node");
import fs = require("fs");

interface config {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  sourcePlaylists: string[];
}

const config = JSON.parse(fs.readFileSync("./config.json", "utf8")) as config;

const spotifyApi = new SpotifyWebApi({
  clientId: config.clientId,
  clientSecret: config.clientSecret,
  refreshToken: config.refreshToken,
});

async function searchTrackInPlaylist(
  playlistId: string,
  trackUri: string
): Promise<boolean> {
  console.log(`Searching track ${trackUri} in playlist ${playlistId}:`);

  let trackFound = false;

  pagination: for (
    let offset: number, dataTotal: number;
    offset === undefined || offset < dataTotal;

  ) {
    const data = await spotifyApi.getPlaylistTracks(playlistId, {
      offset: offset,
    });
    for (const item of data.body.items) {
      if (item.track.uri === trackUri) {
        console.log(`Found track "${item.track.name}"`);
        trackFound = true;
        break pagination;
      }
    }

    offset = data.body.offset + data.body.limit;
    dataTotal = data.body.total;
  }

  if (!trackFound) {
    console.log(`Track ${trackUri} not found in playlist ${playlistId}`);
  }

  return trackFound;
}

function addTrackToPlaylist(playlistId: string, trackUri: string) {
  return searchTrackInPlaylist(playlistId, trackUri).then((isInPlaylist) => {
    if (!isInPlaylist) {
      console.log(`Adding track ${trackUri} to playlist ${playlistId}`);
      return spotifyApi.addTracksToPlaylist(playlistId, [trackUri]);
    } else {
      console.log(`Skip adding track ${trackUri}`);
    }
  });
}

function saveFirstOfPlaylist(sourcePlaylistId: string): Promise<void> {
  console.log("Getting playlist info & tracks:");
  return Promise.all([
    spotifyApi.getPlaylist(sourcePlaylistId).then((data) => {
      const name = data.body.name;
      console.log(`Source playlist name is "${name}"`);
      return name;
    }),
    spotifyApi
      .getPlaylistTracks(sourcePlaylistId, { limit: 1 })
      .then((data) => {
        const track = data.body.items[0].track;
        console.log(`First track is "${track.name}"`);
        return track.uri;
      }),
  ]).then(async (results) => {
    let targetPlaylistId;

    pagination: for (
      let offset: number, dataTotal: number;
      offset === undefined || offset < dataTotal;

    ) {
      const data = await spotifyApi.getUserPlaylists({ offset: offset });
      for (const item of data.body.items) {
        if (item.description.includes(`Top of ${results[0]}`)) {
          console.log(`Found target playlist with name "${item.name}"`);
          targetPlaylistId = item.id;
          break pagination;
        }
      }

      offset = data.body.offset + data.body.limit;
      dataTotal = data.body.total;
    }

    if (!targetPlaylistId) {
      console.log("No target playlist found, creating one:");
      const data = await spotifyApi.createPlaylist(`Top: ${results[0]}`, {
        description: `Top of ${results[0]} (Marker, don't remove)`,
        public: false,
      });
      console.log(`Created new private playlist with id ${data.body.id}`);
      targetPlaylistId = data.body.id;
    }

    if (targetPlaylistId) {
      await addTrackToPlaylist(targetPlaylistId, results[1]);
    } else {
      console.warn("No target playlist found!");
    }
  });
}

console.log("Refreshing token:");
spotifyApi.refreshAccessToken().then(async (data) => {
  spotifyApi.setAccessToken(data.body["access_token"]);
  console.log("Got access token");

  for (const playlistId of config.sourcePlaylists) {
    console.log(`\nPlaylist ${playlistId}:`);
    await saveFirstOfPlaylist(playlistId);
  }
});
