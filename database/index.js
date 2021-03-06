const { Client } = require('pg');
const path = require('path');
const fs = require('fs');

const client = new Client({
  // connectionString: process.env.DATABASE_URL,

  connectionString: 'postgres://localhost:5432/slap',
  // ssl: true,
});

client
  .connect()
  .then()
  .catch(err => console.error('error connecting to postgres db, ', err.stack));

// create tables needed by server
const initializeDB = () => {
  // initialize tables by reading schema files and running as query
  const schemas = ['/schema/users.sql', '/schema/workspaces.sql', '/schema/directmsg.sql', '/schema/dMessages.sql'];
  return Promise.all(schemas.map(schema =>
    new Promise((resolve, reject) => {
      fs.readFile(
        path.join(__dirname, schema),
        'utf8',
        (err, data) => (err ? reject(err) : resolve(data)),
      );
    }).then(data => client.query(data))));
};

// post member for workspace from database
// const postMember = (username, workspaceId) =>
//   // pull workspace table name using workspaceId
//   client
//     .query('SELECT db_name from workspaces where id = $1', [workspaceId])
//     // post new member into workspace's members table
//     .then(data =>
//       client.query(
//         'INSERT into $db_name (username) VALUES ($1, $2) RETURNING *'.replace(
//           '$db_name',
//           data.rows[0].db_name,
//         ),
//         [username],
//       ));

// post message to database
const postMessage = (message, username, workspaceId) => {

  return client
    .query('SELECT db_name FROM workspaces WHERE id = $1', [workspaceId])
    // post new message into workspace's messages table
    .then(data =>
      client.query(
        'INSERT INTO $db_name (text, username) VALUES ($1, $2) RETURNING *'.replace(
          '$db_name',
          data.rows[0].db_name,
        ),
        [message, username],
      )).then(data => data.rows[0])
};
// pull workspace messages table name using workspaceId

const postDMessage = (message, username, workspaceName) =>

  client
    .query(
    'INSERT INTO dMessages (text, username, workspacename) VALUES ($1, $2, $3) RETURNING *',
    [message, username, workspaceName],
  )
    .then(data => data.rows);

const postDUser = (username, workspaceName) => {
  client
    .query(
    'INSERT INTO directmsg (username, workspacename) VALUES ($1, $2) RETURNING *',
    [username, workspaceName],
  )
    .then(data => console.log('this is postDUser data returned', data));
};


// get messages for workspace from database
const getMessages = workspaceId =>
  // pull workspace messages table name using workspaceId
  client
    .query('SELECT db_name FROM workspaces WHERE id = $1', [workspaceId])
    // pull messages from workspace's messages table
    .then(data => client.query(`SELECT * FROM ${data.rows[0].db_name}`))
    .then(data => data.rows);

const getDMessages = (workspaceName) => {
  // pull workspace messages table name using workspaceName
  return client.query('SELECT * FROM dmessages WHERE dmessages.workspacename = $1', [workspaceName])
    .then((data) => {
      console.log('getDMessages Data :', data.rows);
      return data.rows;
    });
};

// post new user to users table in database
const createUser = (username, passhash, email, passhint) =>
  client.query(
    'INSERT INTO users (username, password, email, password_hint) VALUES ($1, $2, $3, $4) RETURNING *',
    [username, passhash, email, passhint],
  ).then(data => data.rows[0]);

// pull user info from users table in database
const getUser = username =>
  client
    .query('SELECT * FROM users WHERE username = ($1)', [username])
    .then(data => data.rows[0]);

// pull user password hint from users table in database
const getPasswordHint = username =>
  client
    .query('SELECT password_hint FROM users WHERE username = ($1)', [username])
    .then(data => data.rows[0]);



// get user profile informaton (does not include login information)
const getProfile = username => 
  client
    .query('SELECT * FROM profiles WHERE username = ($1)', [username])
    .then(data => data.rows[0]);

// create new user profile (does not include login information)
const createProfile = (username, fullname, status, bio, phone) => 
  client
    .query('INSERT INTO profiles (username, fullname, status, bio, phone) VALUES ($1, $2, $3, $4, $5)',
    [username, fullname, status, bio, phone])
    .then(data => data.rows[0]);

// update existing user profile information (does not include login information)
const updateProfile = (username, fullname, status, bio, phone) => 
  client
    .query('UPDATE profiles SET fullname=($2), status=($3), bio=($4), phone=($5) WHERE username=($1)', 
    [username, fullname, status, bio, phone])
    .then(data => data.rows[0]);

// save uploaded profile image url
const saveProfileImage = (username, imageUrl) =>
  client
    .query('UPDATE profiles SET image=($2) WHERE username=($1)', [username, imageUrl])
    .then(data => data.rows[0]);


// creates a new workspace
const createWorkspace = (name, dbName = `ws_${name[0]}${Date.now()}`) =>
  // add a new entry into workspaces table
  client.query('INSERT INTO workspaces (name, db_name) VALUES ($1, $2) RETURNING *', [name, dbName])
    .then(() =>
      // read messages schema and insert workspace table name
      new Promise((resolve, reject) => {
        fs.readFile(
          path.join(__dirname, '/schema/messages.sql'),
          'utf8',
          (err, data) => (err ? reject(err) : resolve(data)),
        );
      }))
    // run query to create messages table for workspace
    .then(data => client.query(data.replace('$1', dbName).replace('$1_pk', `${dbName}_pk`)));

// pull list of workspaces from database
const getWorkspaces = () => client.query('SELECT * FROM workspaces').then(data => data.rows);

// pull all emails from users table
const getEmails = () => client.query('SELECT email FROM users')
  .then(data => data.rows);

const getUsers = () => client.query('SELECT id, username FROM users')
  .then(data => data.rows);

// create necessary tables if environment flag INITIALIZEDB is set to true

//if (process.env.INITIALIZEDB) {
  initializeDB()
    .then(() => console.log('Connected'))
    .catch(err => console.error('error creating database tables, ', err.stack));
//}

module.exports = {
  client,
  initializeDB,
  postMessage,
  getMessages,
  getDMessages,
  createUser,
  getUser,
  getProfile,
  createProfile,
  updateProfile,
  saveProfileImage,
  createWorkspace,
  getWorkspaces,
  getEmails,
  getPasswordHint,
  getUsers,
  postDUser,
  postDMessage,
};
