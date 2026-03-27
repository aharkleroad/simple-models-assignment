// pull in our models. This will automatically load the index.js from that folder
const models = require('../models');

// get the Cat model
const { Cat, Dog } = models;

// Function to handle rendering the index page.
const hostIndex = async (req, res) => {
  //Start with the name as unknown
  let name = 'unknown';

  try {
    /* Cat.findOne() will find a cat that matches the query given to it as the first parameter.
       In this case, we give it an empty object so it will match against any object it finds.
       The second parameter is essentially a filter for the values we want. This works similarly
       to the .select() function. The third parameter is the general options object. Here we
       are passing in an options object with a "sort" key which tells Mongo to sort the data
       before sending anything back. We then specifically tell it to sort by the created date
       in descending order (so that more recent things are "on the top"). Since we are only
       finding one, this query will either find the most recent cat if it exists, or nothing.
    */
    const doc = await Cat.findOne({}, {}, {
      sort: { 'createdDate': 'descending' }
    }).lean().exec();

    //If we did get a cat back, store it's name in the name variable.
    if (doc) {
      name = doc.name;
    }
  } catch (err) {
    //Just log out the error for our records.
    console.log(err);
  }

  /* res.render will render the given view from the views folder. In this case, index.
     We pass it a number of variables to populate the page.
  */
  res.render('index', {
    currentName: name,
    title: 'Home',
    pageName: 'Home Page',
  });
};

// Function for rendering the page1 template
// Page1 has a loop that iterates over an array of cats
const hostPage1 = async (req, res) => {
  /* Remember that our database is an entirely separate server from our node
     code. That means all interactions with it are async, and just because our
     server is up doesn't mean our database is. Therefore, any time we
     interact with it, we need to account for scenarios where it is not working.
     That is why the code below is wrapped in a try/catch statement.
  */
  try {
    /* We want to find all the cats in the Cat database. To do this, we need
       to make a "query" or a search. Queries in Mongoose are "thenable" which
       means they work like promises. Since they work like promises, we can also
       use await/async with them.

       The result of any query will either throw an error, or return zero, one, or
       multiple "documents". Documents are what our database stores. It is often
       abbreviated to "doc" or "docs" (one or multiple).

       .find() is a function in all Mongoose models (like our Cat model). It takes
       in an object as a parameter that defines the search. In this case, we want
       to find every cat, so we give it an empty object because that will not filter
       out any cats.

       .lean() is a modifier for the find query. Instead of returning entire mongoose
       documents, .lean() will only return the JS Objects being stored. Try printing
       out docs with and without .lean() to see the difference.

       .exec() executes the chain of operations. It is not strictly necessary and
       can be removed. However, mongoose gives better error messages if we use it.
    */
    const docs = await Cat.find({}).lean().exec();

    // Once we get back the docs array, we can send it to page1.
    return res.render('page1', { cats: docs });
  } catch (err) {
    /* If our database returns an error, or is unresponsive, we will print that error to
       our console for us to see. We will also send back an error message to the client.

       We don't want to send back the err from mongoose, as that would be unsafe. You
       do not want people to see actual error messages from your server or database, or else
       they can exploit them to attack your server.
    */
    console.log(err);
    return res.status(500).json({ error: 'failed to find cats' });
  }
};

// Function to render the untemplated page2.
const hostPage2 = (req, res) => {
  res.render('page2');
};

// Function to render the untemplated page3.
const hostPage3 = (req, res) => {
  res.render('page3');
};

// Get name will return the name of the last added cat.
const getName = async (req, res) => {
  try {
    /* Here we are trying to do the exact same thing we did in host index up
       above. We want to find the most recently added cat. The only difference
       here is that we are using the query .sort() function rather than passing
       the sort in as a part of the 3rd parameter options object. Both work
       functionally the same. We are just seeing that it can be written in
       more than one way.
    */
    const doc = await Cat.findOne({}).sort({ 'createdDate': 'descending' }).lean().exec();

    //If we did get a cat back, store it's name in the name variable.
    if (doc) {
      return res.json({ name: doc.name });
    }
    return res.status(404).json({ error: 'No cat found' });
  } catch (err) {
    /* If an error occurs, it means something went wrong with the database. We will
       give the user a 500 internal server error status code and an error message.
    */
    console.log(err);
    return res.status(500).json({ error: 'Something went wrong contacting the database' });
  }
}

// Function to create a new cat in the database
const setName = async (req, res) => {
  if (!req.body.firstname || !req.body.lastname || !req.body.beds) {
    // If they are missing data, send back an error.
    return res.status(400).json({ error: 'firstname, lastname and beds are all required' });
  }

  const catData = {
    name: `${req.body.firstname} ${req.body.lastname}`,
    bedsOwned: req.body.beds,
  };

  /* Once we have our cat object set up. We want to turn it into something the database
     can understand. To do this, we create a new instance of a Cat using the Cat model
     exported from the Models folder.

     Note that this does NOT store the cat in the database. That is the next step.
  */
  const newCat = new Cat(catData);

  /* We have now setup a cat in the right format. We now want to store it in the database.
     Again, because the database and node server are separate things entirely we have no
     way of being sure the database will work or respond. Because of that, we wrap our code
     in a try/catch.
  */
  try {
    /* newCat is a version of our catData that is database-friendly. If you print it, you will
       see it has extra information attached to it other than name and bedsOwned. One thing it
       now has is a .save() function. This function will intelligently add or update the cat in
       the database. Since we have never saved this cat before, .save() will create a new cat in
       the database. All calls to the database are async, including .save() so we will await the
       databases response. If something goes wrong, we will end up in our catch() statement. If
       not, we will return a 201 to the user with the cat info.
    */
    await newCat.save();
    return res.status(201).json({
      name: newCat.name,
      beds: newCat.bedsOwned,
    });
  } catch (err) {
    /* If something goes wrong while communicating with the database, log the error and send
       an error message back to the client. Note that our return will return us from the setName
       function, not just the catch statement. That means we can treat the code below the catch
       as being our "if the try worked"
    */
    console.log(err);
    return res.status(500).json({ error: 'failed to create cat' });
  }
};

// Function to handle searching a cat by name.
const searchName = async (req, res) => {
  /* When the user makes a POST request, bodyParser populates req.body with the parameters
     as we saw in setName() above. In the case of searchName, the user is making a GET request.
     GET requests do not have a body, but they can have query parameters. bodyParser will also
     handle these, and store them in req.query instead.

     If the user does not give us a name to search by, throw an error.
  */
  if (!req.query.name) {
    return res.status(400).json({ error: 'Name is required to perform a search' });
  }

  /* If they do give us a name to search, we will as the database for a cat with that name.
     Remember that since we are interacting with the database, we want to wrap our code in a
     try/catch in case the database throws an error or doesn't respond.
  */
  let doc;
  try {
    /* Just like Cat.find() in hostPage1() above, Mongoose models also have a .findOne()
       that will find a single document in the database that matches the search parameters.
       This function is faster, as it will stop searching after it finds one document that
       matches the parameters. The downside is you cannot get multiple responses with it.

       One of three things will occur when trying to findOne in the database.
        1) An error will be thrown, which will stop execution of the try block and move to
            the catch block.
        2) Everything works, but the name was not found in the database returning an empty
            doc object.
        3) Everything works, and an object matching the search is found.
    */
    doc = await Cat.findOne({ name: req.query.name }).exec();
  } catch (err) {
    // If there is an error, log it and send the user an error message.
    console.log(err);
    return res.status(500).json({ error: 'Something went wrong' });
  }

  // If we do not find something that matches our search, doc will be empty.
  if (!doc) {
    return res.status(404).json({ error: 'No cats found' });
  }

  // Otherwise, we got a result and will send it back to the user.
  return res.json({ name: doc.name, beds: doc.bedsOwned });
};

/* A function for updating the last cat added to the database.
   Usually database updates would be a more involved process, involving finding
   the right element in the database based on query, modifying it, and updating
   it. For this example we will just update the last one we added for simplicity.
*/
const updateLast = (req, res) => {
  /* We want to increase the number of beds owned by the most recently added cat.
     To accomplish this we need to use the findOneAndUpdate function. The first
     parameter is the query. Since we need to sort the results to find the most
     recently added cat we want an empty query so that it can find all of the cats.

     The second parameter is the actual update. Usually this would just be an unnested
     object like {'bedsOwned': 1}. However this will set the cat's bedsowned to 1, not
     increase it. So instead we need to use the Mongo macro $inc as a key to another
     object. Essentially this says "everything defined in this subobject is an increment
     not a set". So {$inc: {'bedsOwned': 1}} says "increase the beds owned by 1".

     Finally, findOneAndUpdate would just update the most recent cat it finds that
     matches the query (which could be any cat). So we also need to tell Mongoose to
     sort all the cats in descending order by created date so that we update the
     most recently added one. The returnDocument key with the 'after' value tells 
     mongoose to give us back the version of the document AFTER the changes. Otherwise
     it will default to 'before' which gives us the document before the update.

     We can use async/await for this, or just use standard promise .then().catch() syntax.
  */
  const updatePromise = Cat.findOneAndUpdate({}, { $inc: { 'bedsOwned': 1 } }, {
    returnDocument: 'after', //Populates doc in the .then() with the version after update
    sort: { 'createdDate': 'descending' }
  }).lean().exec();

  // If we successfully save/update them in the database, send back the cat's info.
  updatePromise.then((doc) => res.json({
    name: doc.name,
    beds: doc.bedsOwned,
  }));

  // If something goes wrong saving to the database, log the error and send a message to the client.
  updatePromise.catch((err) => {
    console.log(err);
    return res.status(500).json({ error: 'Something went wrong' });
  });
};

// adds a new Dog to the database
const addDog = async (req, res) => {
  // return a 400 error if one of the fields is empty
  if (!req.body.name || !req.body.breed || !req.body.age) {
    return res.status(400).json({ error: "Dog name, breed, and age are all required" });
  }

  // check if a dog name is already used in the database (for more specific error message than creation failed)
  try {
    let currentDog = await Dog.find({ name: req.body.name }).lean().exec();
    console.log(currentDog);
    if (currentDog.length !== 0) {
      return res.status(400).json({ error: "Dog name already in use, please enter a different name" });
    }
  }
  catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Something went wrong" });
  }

  // if it isn't, create dog model 
  const dogData = {
    name: req.body.name,
    breed: req.body.breed,
    age: req.body.age
  };

  const newDog = new Dog(dogData);

  // try to add dog to database
  try {
    await newDog.save();
    // return dog info to the user
    return res.status(201).json({ name: newDog.name, breed: newDog.breed, age: newDog.age });
  }
  catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Failed to create Dog" });
  }
}

// searches for a dog by name and adds 1 to it's age if one is found
const updateDogByName = async (req, res) => {
  // make sure there is a name to search by
  if (!req.body.name) {
    return res.status(400).json({ error: "Dog name required" });
  }
  // find and update the dog with that name
  try {
    let dog = await Dog.findOneAndUpdate({name: req.body.name}, {$inc:{'age': 1}}, {
      returnDocument: 'after'
    }).lean().exec();

    // return the dogs info, if any exists
    if (dog) {
      return res.json({name: dog.name, breed: dog.breed, age: dog.age});
    }
    // return not found if the dog doesn't exist
    return res.status(404).json({error: 'No dog with that name found'});
  }
  catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Error finding or updating dog" });
  }
}

// A function to send back the 404 page.
const notFound = (req, res) => {
  res.status(404).render('notFound', {
    page: req.url,
  });
};

// export the relevant public controller functions
module.exports = {
  index: hostIndex,
  page1: hostPage1,
  page2: hostPage2,
  page3: hostPage3,
  getName,
  setName,
  updateLast,
  searchName,
  addDog,
  updateDogByName,
  notFound,
};
