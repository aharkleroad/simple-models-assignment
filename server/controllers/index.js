const models = require('../models');

const { Cat, Dog } = models;

// Function to handle rendering the index page.
const hostIndex = async (req, res) => {
  //Start with the name as unknown
  let name = 'unknown';

  try {
    // sort cats (newest created to oldest) and get the first cat
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

  // display the newest cat's name on the index page
  res.render('index', {
    currentName: name,
    title: 'Home',
    pageName: 'Home Page',
  });
};

// Function for rendering the page1 template
// Page1 has a loop that iterates over an array of cats
const hostPage1 = async (req, res) => {
  try {
    // get an array of all cats
    const docs = await Cat.find({}).lean().exec();

    // send it to page1.
    return res.render('page1', { cats: docs });
  } catch (err) {
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

// renders templated page 4
const hostPage4 = async (req, res) => {
  // get list of all dogs to send to page 4
  try {
    const dogs = await Dog.find({}).lean().exec();
    return res.render('page4', {dogs: dogs});
  }
  catch (err) {
    console.log(err);
    return res.status(500).json({ error: 'Failed to find dogs' });
  }
}

// Get name will return the name of the last added cat.
const getName = async (req, res) => {
  try {
    // find the most recently added cat
    const doc = await Cat.findOne({}).sort({ 'createdDate': 'descending' }).lean().exec();

    //If we did get a cat back, store it's name in the name variable.
    if (doc) {
      return res.json({ name: doc.name });
    }
    return res.status(404).json({ error: 'No cat found' });
  } catch (err) {
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

  // create cat data (should be the same format as our schema)
  const catData = {
    name: `${req.body.firstname} ${req.body.lastname}`,
    bedsOwned: req.body.beds,
  };

  // create a new Cat using our CatModel (and formatted data)
  const newCat = new Cat(catData);

  try {
    // add the cat to the database & return Cat data to user
    await newCat.save();
    return res.status(201).json({
      name: newCat.name,
      beds: newCat.bedsOwned,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: 'failed to create cat' });
  }
};

// Function to handle searching a cat by name.
const searchName = async (req, res) => {
  // If the user does not give us a name to search by, throw an error.
  if (!req.query.name) {
    return res.status(400).json({ error: 'Name is required to perform a search' });
  }

  // search for a cat with the given name
  let doc;
  try {
    doc = await Cat.findOne({ name: req.query.name }).exec();
  } catch (err) {
    // If there is an error, log it and send the user an error message.
    console.log(err);
    return res.status(500).json({ error: 'Something went wrong' });
  }

  // If we do not find something that matches our search, doc will be empty, return 404 error
  if (!doc) {
    return res.status(404).json({ error: 'No cats found' });
  }

  // Otherwise, we got a result and will send it back to the user.
  return res.json({ name: doc.name, beds: doc.bedsOwned });
};

// A function for updating the last cat added to the database.
const updateLast = (req, res) => {
  // find the most recent cat and increase its bedsOwned by 1
  const updatePromise = Cat.findOneAndUpdate({}, { $inc: { 'bedsOwned': 1 } }, {
    returnDocument: 'after', //Populates doc in the .then() with the version after update
    sort: { 'createdDate': 'descending' }
  }).lean().exec();

  // If we successfully save/update them in the database, send back the cat's info to the user
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

  // check if a dog name is already used in the database (throws more specific error than creation failed)
  try {
    let currentDog = await Dog.find({ name: req.body.name }).lean().exec();
    if (currentDog.length !== 0) {
      return res.status(400).json({ error: "Dog name already in use, please enter a different name" });
    }
  }
  catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Something went wrong" });
  }

  // if it isn't, create dog data and a new dog based on it 
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
  page4: hostPage4,
  getName,
  setName,
  updateLast,
  searchName,
  addDog,
  updateDogByName,
  notFound,
};
