const express = require("express");
const axios = require("axios");
const cors = require("cors");
const Redis = require("redis");

const app = express();
app.use(cors());

const redisClient = Redis.createClient({ host: "localhost", port: 6379 });
const DEFAULT_EXPIRY_TIME = 36000;
redisClient.on("connect", () => console.log("Connected to Redis!"));
redisClient.on("error", (err) => console.log("Redis Client Error", err));
redisClient.connect();

app.get("/photos", async (req, res) => {
  try {
    const albumId = req.query.albumId;
    const photos = await getOrSetCache(
      `photos?albumId=${albumId}`,
      async () => {
        const baseurl = "http://jsonplaceholder.typicode.com/photos";
        const { data } = await axios.get(baseurl, { params: { albumId } });
        return data;
      }
    );
    res.json(photos);
  } catch (err) {
    console.log(err);
    res.send(err.message);
  }
});

app.get("/photos/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const photo = await getOrSetCache(`photos:${id}`, async () => {
      const baseurl = `http://jsonplaceholder.typicode.com/photos/${id}`;
      const { data } = await axios.get(baseurl);
      return data;
    });
    res.json(photo);
  } catch (err) {
    console.log(err);
    res.send(err.message);
  }
});

function getOrSetCache(key, cb) {
  return new Promise(async (resolve, reject) => {
    try {
      const data = await redisClient.get(key);
      if (data != null) return resolve(JSON.parse(data));
      const freshData = await cb();
      redisClient.setEx(key, DEFAULT_EXPIRY_TIME, JSON.stringify(freshData));
      return resolve(freshData);
    } catch (err) {
      reject(err);
    }
  });
}

const port = 5000;
app.listen(port, () => {
  console.log("Express server connected");
});
