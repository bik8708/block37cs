require("dotenv").config();

const pg = require("pg");
const client = new pg.Client();
const uuid = require("uuid");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const secret = process.env.JWT || "shhhh";

const createTables = async () => {
  try {
    const SQL = `
    DROP TABLE IF EXISTS comments;
    DROP TABLE IF EXISTS reviews;
    DROP TABLE IF EXISTS items;
    DROP TABLE IF EXISTS users;

    CREATE TABLE users(
      id UUID PRIMARY KEY,
      username VARCHAR(20) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL
    );
    CREATE TABLE items(
      id UUID PRIMARY KEY,
      name VARCHAR(120) NOT NULL
    );
    CREATE TABLE reviews(
      id UUID PRIMARY KEY,
      user_id UUID REFERENCES users(id) NOT NULL,
      item_id UUID REFERENCES items(id) NOT NULL,
      title VARCHAR (120) NOT NULL,
      body TEXT NOT NULL,
      rating INTEGER CHECK (rating BETWEEN 1 AND 5),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,CONSTRAINT unique_user_item_review UNIQUE (user_id, item_id)
    );
      CREATE TABLE comments(
      id UUID PRIMARY KEY,
      user_id UUID REFERENCES users(id) NOT NULL,
      review_id UUID REFERENCES reviews(id) NOT NULL,
      post TEXT NOT NULL
    );
  `;
    await client.query(SQL);
  } catch (err) {
    console.log(err);
    throw err;
  }
};

const createUser = async ({ username, password }) => {
  try {
    const SQL = `INSERT INTO users(id, username, password) VALUES ($1, $2, $3)RETURNING *`;
    const { rows } = await client.query(SQL, [
      uuid.v4(),
      username,
      await bcrypt.hash(password, 5),
    ]);
    console.log(rows);
    // return response.rows[0];
    return rows[0];
  } catch (err) {
    console.log("createUser", err);
    throw err;
  }
};

const createItem = async (itemName) => {
  try {
    const SQL = `INSERT into items(id, name) VALUES ($1, $2) RETURNING *;`;
    const { rows } = await client.query(SQL, [uuid.v4(), itemName]);
    return rows[0];
  } catch (err) {
    console.log("createItem", err);
    throw err;
  }
};
0;

const createReview = async ({ user_id, item_id, title, body, rating }) => {
  try {
    const SQL = `Insert into reviews(id, user_id, item_id, title, body, rating) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;`;
    const { rows } = await client.query(SQL, [
      uuid.v4(),
      user_id,
      item_id,
      title,
      body,
      rating,
    ]);
    console.log("Review created:", rows[0]);
    return rows[0];
  } catch (err) {
    console.log("createReview", err);
    throw err;
  }
};

const createComment = async ({ user_id, review_id, post }) => {
  try {
    const SQL = `Insert into comments(id, user_id, review_id, post) VALUES ($1, $2, $3, $4) RETURNING *;`;
    const { rows } = await client.query(SQL, [
      uuid.v4(),
      user_id,
      review_id,
      post,
    ]);
    console.log("Comment created:", rows[0]);
    return rows[0];
  } catch (err) {
    console.log("createComment", err);
    throw err;
  }
};

const authenticate = async ({ username, password }) => {
  const SQL = `SELECT id, username, password FROM users WHERE username = $1;`;

  const response = await client.query(SQL, [username]);

  if (
    !response.rows.length ||
    (await bcrypt.compare(password, response.rows[0].password)) === false
  ) {
    const error = Error("not authorized - authenticate");
    error.status = 401;
    throw error;
  }
  const token = jwt.sign({ id: response.rows[0].id }, secret);
  return { token };
};

const findUserbyToken = async (token) => {
  console.log("TESTTOKEN", token);
  let id;
  try {
    const payload = jwt.verify(token, secret);
    console.log("PAYLOAD", payload);
    id = payload.id;
  } catch (err) {
    const error = Error("Not authorized", { cause: err });
    error.status = 401;
    throw error;
  }
  const SQL = `
      SELECT id, username FROM users WHERE id=$1;
    `;
  const response = await client.query(SQL, [id]);
  if (!response.rows.length) {
    const error = Error("not Authorized");
    error.status = 401;
    throw error;
  }
  return response.rows[0];
};

const isLoggedIn = async (req, res, next) => {
  try {
    console.log("MIDDLEWARE RUNNING");

    console.log("Authorization Header:", req.headers.authorization);
    const token = req.headers.authorization;

    console.log("token2", token);

    req.user = await findUserbyToken(token);

    console.log("AUTHENTICATED USER:", req.user);
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  client,
  createTables,
  createUser,
  createItem,
  createReview,
  createComment,
  authenticate,
  findUserbyToken,
  isLoggedIn,
};
