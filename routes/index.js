var express = require('express');
var router = express.Router();

var db = require('../db/db.js')


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/search', function(req, res, next) {
  console.log(req.query.key)
  let sql = "SELECT * FROM DEPT where DEPT_NAME = '" + req.query.key + "'"
  db.sql(sql).then(data => {
    console.log(data)
    res.json({code: 2000, data: data.recordset});
  })
})

router.post('/getList', function(req, res, next) {
  res.send('ok')
})

module.exports = router;
