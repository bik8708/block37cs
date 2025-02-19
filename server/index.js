require("dotenv").config();

const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const secret = process.env.JWT || "shhh";
const uuid = require("uuid");
const PORT = process.env.PORT || 3000;

app.use(express.json());

const {
  client,
  createTables,
  createUser,
  createItem,
  createReview,
  createComment,
  authenticate,
  findUserbyToken,
  isLoggedIn,
} = require("./db");

app.post("/api/auth/register", async (req, res, next) => {
  try {
    console.log(req.body);
    const newUser = await createUser({
      username: req.body.username,
      password: req.body.password,
    });
    const token = jwt.sign({ id: newUser.id }, secret);
    res.status(201).send({ token });
  } catch (err) {
    next(err);
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    res.send(await authenticate(req.body));
  } catch (err) {
    next(err);
  }
});

//PROTECTED ROUTE
app.get("/api/auth/me", isLoggedIn, async (req, res, next) => {
  try {
    console.log("authorization", req.headers.authorization);
    res.send(await findUserbyToken(req.headers.authorization));
  } catch (err) {
    next(err);
  }
});

app.get("/api/items", async (req, res, next) => {
  try {
    const response = await client.query(`SELECT * FROM items`);
    console.log(response.rows);
    res.send(response.rows);
  } catch (err) {
    next(err);
  }
});

//created reviews route for testing

app.get("/api/reviews", async (req, res, next) => {
  try {
    const response = await client.query(`SELECT * FROM reviews`);
    console.log(response.rows);
    res.send(response.rows);
  } catch (err) {
    next(err);
  }
});

app.get("/api/items/:itemId", async (req, res, next) => {
  try {
    const { itemId } = req.params;
    console.log("logging id", itemId);
    const response = await client.query(`SELECT * FROM items WHERE id = $1`, [
      itemId,
    ]);
    // console.log("get itemId", response.rows[0]);
    res.send(response.rows[0]);
  } catch (err) {
    next(err);
  }
});

app.get("/api/items/:itemId/reviews", async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const response = await client.query(
      `SELECT 
        reviews.id AS review_id,
        reviews.title,
        reviews.body,
        reviews.rating,
        reviews.created_at,
        users.id AS user_id,
        users.username
        FROM reviews
        JOIN users ON reviews.user_id = users.id
        WHERE reviews.item_id = $1
        `,
      [itemId]
    );
    res.send(response.rows[0]);
  } catch (err) {
    next(err);
  }
});

app.get("/api/items/:itemId/reviews/:reviewId", async (req, res, next) => {
  try {
    const { itemId, reviewId } = req.params;
    const response = await client.query(
      `SELECT 
        reviews.id AS review_id,
        reviews.title,
        reviews.body,
        reviews.rating,
        reviews.created_at,
        users.id AS user_id,
        users.username
        FROM reviews
        JOIN users ON reviews.user_id = users.id
        WHERE reviews.item_id = $1 AND reviews.id = $2;
        `,
      [itemId, reviewId]
    );
    res.send(response.rows[0]);
  } catch (err) {
    next(err);
  }
});

//PROTECTED ROUTE
app.post("/api/items/:itemId/reviews", isLoggedIn, async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const userId = req.user.id;
    const { title, body, rating } = req.body;
    const SQL = `INSERT INTO reviews (id, user_id, item_id, title, body, rating)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;`;
    const { rows } = await client.query(SQL, [
      uuid.v4(),
      userId,
      itemId,
      title,
      body,
      rating,
    ]);
    res.status(201).send(rows[0]);
  } catch (err) {
    next(err);
  }
});

//PROTECTED ROUTE
app.get("/api/reviews/me", isLoggedIn, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const SQL = `SELECT reviews.*, users.username FROM reviews
        JOIN users ON reviews.user_id = users.id
        WHERE reviews.user_id = $1;
        `;
    const response = await client.query(SQL, [userId]);
    res.send(response.rows[0]);
  } catch (err) {
    next(err);
  }
});

//PROTECTED ROUTE
app.put(
  "/api/users/:userId/reviews/:reviewId",
  isLoggedIn,
  async (req, res, next) => {
    try {
      const { userId, reviewId } = req.params;
      const userLoggedIn = req.user.id;
      const { title, body, rating } = req.body;
      const SQL = `UPDATE reviews SET title = $1, body = $2, rating = $3 WHERE id = $4 RETURNING *;`;
      const { rows } = await client.query(SQL, [title, body, rating, reviewId]);
      res.status(200).send(rows[0]);
    } catch (err) {
      next(err);
    }
  }
);

//PROTECTED ROUTE
app.post(
  "/api/items/:itemId/reviews/:reviewId/comments",
  isLoggedIn,
  async (req, res, next) => {
    try {
      const { itemId, reviewId } = req.params;
      const userId = req.user.id;
      const { post } = req.body;
      const SQL = `INSERT INTO comments (id, user_id, review_id, post)
      VALUES ($1, $2, $3, $4)
      RETURNING *;`;
      const { rows } = await client.query(SQL, [
        uuid.v4(),
        userId,
        reviewId,
        post,
      ]);
      res.status(201).send(rows[0]);
    } catch (err) {
      next(err);
    }
  }
);

//PROTECTED ROUTE
app.get("/api/comments/me", isLoggedIn, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const SQL = `SELECT comments.*, users.username FROM comments
        JOIN users ON comments.user_id = users.id
        WHERE comments.user_id = $1;
        `;
    const response = await client.query(SQL, [userId]);
    res.send(response.rows[0]);
  } catch (err) {
    next(err);
  }
});

//PROTECTED ROUTE
app.put(
  "/api/users/:userId/comments/:commentId",
  isLoggedIn,
  async (req, res, next) => {
    try {
      const { userId, commentId } = req.params;
      const userLoggedIn = req.user;
      const { post } = req.body;
      const SQL = `UPDATE comments SET post = $1 WHERE id = $2 RETURNING *;`;
      const { rows } = await client.query(SQL, [post, commentId]);
      res.status(200).send(rows[0]);
    } catch (err) {
      next(err);
    }
  }
);

//PROTECTED ROUTE
app.delete(
  "/api/users/:userId/comments/:commentId",
  isLoggedIn,
  async (req, res, next) => {
    try {
      const { userId, commentId } = req.params;
      const userLoggedIn = req.user;
      const SQL = `DELETE FROM comments where user_id = $1 and id = $2 RETURNING *;`;
      const { rows } = await client.query(SQL, [userId, commentId]);
      res.sendStatus(200);
    } catch (err) {
      next(err);
    }
  }
);

//PROTECTED ROUTE
app.delete(
  "/api/users/:userId/reviews/:reviewId",
  isLoggedIn,
  async (req, res, next) => {
    try {
      const { userId, reviewId } = req.params;
      const userLoggedIn = req.user;
      const SQL = `DELETE FROM reviews where user_id = $1 and id = $2 RETURNING *;`;
      const { rows } = await client.query(SQL, [userId, reviewId]);
      res.sendStatus(204);
    } catch (err) {
      next(err);
    }
  }
);

const init = async () => {
  try {
    await client.connect();
    app.listen(PORT, () => {
      console.log(`Server live on port ${PORT}`);
    });
  } catch (err) {
    console.log(err);
  }
};

init();
