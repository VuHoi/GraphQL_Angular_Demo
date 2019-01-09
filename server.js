const express = require('express');
const app = express();
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
// configure middleware for express
app.use(express.static('./dist/GrapQL'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
const corsOptions = {
  origin: 'http://localhost',
  credentials: true
};

app.use(cors(corsOptions));
// declare graphQL
const Recipe = require('./models/Recipe');
const User = require('./models/User');

const {graphiqlExpress, graphqlExpress} = require('apollo-server-express');
const {makeExecutableSchema} = require('graphql-tools');

const {typeDefs} = require('./schema');
const {resolvers} = require('./resolvers');
// create schema
const schema = makeExecutableSchema({
  typeDefs,
  resolvers
});

// declare apis
// const userController = require('./apis/userController');
//config environment
require('dotenv').config({path: 'variables.env'});
const configRoute = require('./middlewares/configRoute');
mongoose.connect(process.env.URL_MONGODB, {useNewUrlParser: true})
  .then(() => console.log('connected mongoose'))
  .catch(err => console.log(err));
const db = mongoose.connection;
app.set('superSecret', process.env.SECRET_MONGODB);


//configure router api
app.all('/*', configRoute);
// app.all('/api/*', [require('./middlewares/validateRequest')]);
// call controller
app.use(async (req, res, next) => {
  const token = req.headers['authorization'];

  if (token !== 'null') {
    try {
      const currentUser = await jwt.verify(token, process.env.SECRET);
      req.currentUser = currentUser;
    } catch (err) {
      console.log(err);
    }
  }

  console.log('token');
  console.log(token);
  next();
});
app.use('/graphiql', graphiqlExpress({endpointURL: '/graphql'}));

app.use('/graphql', bodyParser.json(), graphqlExpress(({currentUser}) => ({
    schema,
    context: {
      Recipe,
      User,
      currentUser
    }
  }))
);
// userController(app);
// configure global path
app.get('/*', function (req, res) {
  res.sendFile(path.join(__dirname, '/dist/GrapQL/index.html'));
});

// configure environment
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});
// configure session
app.use(session({
  secret: process.env.SECRET_SESSION,
  resave: true,
  saveUninitialized: false,
  cookie: {},
  store: new MongoStore({
    mongooseConnection: db
  })
}));

// Start the app by listening on the default Heroku port
app.listen(process.env.PORT || 3001);

