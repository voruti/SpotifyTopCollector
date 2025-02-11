import { SpotifyApi } from "@spotify/web-api-ts-sdk";
import fs = require("fs");

interface config {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  sourcePlaylists: string[];
}

const config = JSON.parse(fs.readFileSync("./config.json", "utf8")) as config;

const sdk = SpotifyApi.withClientCredentials(
  config.clientId,
  config.clientSecret
);

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
    const data = await sdk.playlists.getPlaylistItems(
      playlistId,
      undefined,
      undefined,
      undefined,
      offset
    );
    for (const item of data.items) {
      if (item.track.uri === trackUri) {
        console.log(`Found track "${item.track.name}"`);
        trackFound = true;
        break pagination;
      }
    }

    offset = data.offset + data.limit;
    dataTotal = data.total;
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
      return sdk.playlists.addItemsToPlaylist(playlistId, [trackUri]);
    } else {
      console.log(`Skip adding track ${trackUri}`);
    }
  });
}

function saveFirstOfPlaylist(sourcePlaylistId: string): Promise<void> {
  console.log("Getting playlist info & tracks:");
  return Promise.all([
    sdk.playlists.getPlaylist(sourcePlaylistId).then((data) => {
      const name = data.name;
      console.log(`Source playlist name is "${name}"`);
      return name;
    }),
    sdk.playlists
      .getPlaylistItems(sourcePlaylistId, undefined,undefined, 1 )
      .then((data) => {
        const track = data.items[0].track;
        console.log(`First track is "${track.name}"`);
        return track.uri;
      }),
  ]).then(async (results) => {
    let targetPlaylistId;

    pagination: for (
      let offset: number, dataTotal: number;
      offset === undefined || offset < dataTotal;

    ) {
      const data = await sdk.currentUser.playlists.playlists(undefined, offset );
      for (const item of data.items) {
        if (item.description.includes(`Top of ${results[0]}`)) {
          console.log(`Found target playlist with name "${item.name}"`);
          targetPlaylistId = item.id;
          break pagination;
        }
      }

      offset = data.offset + data.limit;
      dataTotal = data.total;
    }

    if (!targetPlaylistId) {
      console.log("No target playlist found, creating one:");
      const data = await sdk.playlists.createPlaylist((await sdk.currentUser.profile()).id,{name:`Top: ${results[0]}`,
        description: `Top of ${results[0]} (Marker, don't remove)`,
        public: false,
      });
      console.log(`Created new private playlist with id ${data.id}`);
      targetPlaylistId = data.id;
    }

    if (targetPlaylistId) {
      await addTrackToPlaylist(targetPlaylistId, results[1]);
    } else {
      console.warn("No target playlist found!");
    }
  });
}

(async ()=> {
  for (const playlistId of config.sourcePlaylists) {
    console.log(`\nPlaylist ${playlistId}:`);
    await saveFirstOfPlaylist(playlistId);
  }
})()