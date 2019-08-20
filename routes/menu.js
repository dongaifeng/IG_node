var express = require('express');
var db = require('../db/db.js')
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  db.sql('SELECT * FROM FIRST_PAGE_MEMU_CONFIG').then(data => {
    res.json({code: 2000, data: data.recordset});
  })
});


module.exports = router;
