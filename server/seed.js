require("dotenv").config();

const {
  client,
  createTables,
  createUser,
  createItem,
  createReview,
  createComment,
} = require("./db");

const seed = async () => {
  try {
    console.log(client);
    await client.connect();
    console.log("creating tables..");
    await createTables();
    console.log("created");

    const [bikna, steve, max, ipad, iphone, macbook] = await Promise.all([
      createUser({ username: "bikna", password: "biknapw" }),
      createUser({ username: "steve", password: "stevepw" }),
      createUser({ username: "max", password: "maxpw" }),
      createItem("iPad"),
      createItem("iPhone"),
      createItem("MacBook"),
    ]);

    console.log("Users:", { bikna, steve, max });
    console.log("Items:", { ipad, iphone, macbook });

    const [reviewOne, reviewTwo, reviewThree] = await Promise.all([
      createReview({
        user_id: bikna.id,
        item_id: ipad.id,
        title: "dont use it often",
        body: "i never use it",
        rating: 3,
      }),
      createReview({
        user_id: steve.id,
        item_id: iphone.id,
        title: "glad i upgraded",
        body: "cool camera",
        rating: 5,
      }),
      createReview({
        user_id: max.id,
        item_id: macbook.id,
        title: "fast computer",
        body: "this is the fastest computer i've used",
        rating: 5,
      }),
    ]);

    const [commentOne, commentTwo, commentThree] = await Promise.all([
      createComment({
        user_id: bikna.id,
        review_id: reviewOne.id,
        post: "thx for sharing",
      }),
      createComment({
        user_id: steve.id,
        review_id: reviewTwo.id,
        post: "I felt the same way",
      }),
      createComment({
        user_id: max.id,
        review_id: reviewThree.id,
        post: "you are spot on",
      }),
    ]);
  } catch (err) {
    console.log(err);
    throw err;
  }
};

seed();
