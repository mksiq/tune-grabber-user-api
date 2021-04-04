const express = require("express");
const cors = require("cors");

const jwt = require("jsonwebtoken");
const passport = require("passport");
const passportJWT = require("passport-jwt");

const dotenv = require("dotenv");
dotenv.config({ path: "./config/.env" });

const ExtractJwt = passportJWT.ExtractJwt;
const JwtStrategy = passportJWT.Strategy;

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme("jwt"),
  secretOrKey: process.env.JWT_SECRET,
};

const strategy = new JwtStrategy(jwtOptions, (jwt_payload, next) => {
  console.log("inside middleware");
  console.log("payload received", jwt_payload);

  if (jwt_payload) {
    // The following will ensure that all routes using
    // passport.authenticate have a req.user._id, req.user.userName values
    // that matches the request payload data
    next(null, { _id: jwt_payload._id, userName: jwt_payload.userName });
  } else {
    next(null, false);
  }
});

passport.use(strategy);

const userService = require("./user-service.js");

const app = express();

const HTTP_PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(cors());
app.use(passport.initialize());

/* TODO Add Routes Here */

(async () => {
  try {
    await userService.connect();
    app.listen(HTTP_PORT, () => {
      console.log("API listening on: " + HTTP_PORT);
    });
  } catch (err) {
    console.log("unable to start the server: " + err);
    process.exit();
  }
})();

app.post("/api/register", async (req, res) => {
  console.log("Inside register");
  try {
    const msg = await userService.registerUser(req.body);
    res.json({ message: msg });
  } catch (err) {
    res.status(422).json({ message: err });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const data = await userService.checkUser(req.body);
    const user = (({ _id, userName } = data), { _id, userName }); // lambda with destructuring
    const token = jwt.sign(user, jwtOptions.secretOrKey);
    console.log(token);
    res.json({ message: "login successful", token: token });
  } catch (err) {
    res.status(422).json({ message: err });
  }
});

app.get(
  "/api/user/favourites",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const data = await userService.getFavourites(req.user._id);
      res.json(data);
    } catch (err) {
      console.log(err);
      res.status(422).json({ message: err });
    }
  }
);

app.put(
  "/api/user/favourites/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const data = await userService.addFavourite(req.user._id, req.params.id);
      res.json(data);
    } catch (err) {
      console.log(err);
      res.status(422).json({ message: err });
    }
  }
);

app.delete(
  "/api/user/favourites/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const data = await userService.removeFavourite(
        req.user._id,
        req.params.id
      );
      res.json(data);
    } catch (err) {
      console.log(err);
      res.status(422).json({ message: err });
    }
  }
);

app.get("/", (req, res) => {
  res.send({ message: "Api listening" });
});
