const pool = require('./db.js')
require('dotenv').config()

exports.getQuestions = async (req, res) => {
  var count = 5;
  if (req.query.count) {
    count = req.query.count
  }
  if (req.query.product_id && Number(req.query.product_id)) {
    const questionsResult = await pool.query(`SELECT id, body, date_written, asker_name, asker_email, reported, helpfulness FROM questionsanswersschema.questions WHERE product_id = ${req.query.product_id} LIMIT ${count}`)
    for (var i = 0; i < questionsResult.rows.length; i++) {
      const answersResult = await pool.query(`SELECT id, body, date_written, answerer_name, helpfulness FROM questionsanswersschema.answers WHERE question_id = ${questionsResult.rows[i].id}`)
      questionsResult.rows[i].answers = {}
      for (var j = 0; j < answersResult.rows.length; j++) {
        questionsResult.rows[i].answers[answersResult.rows[j].id] = answersResult.rows[j]
        const answersPhotosResult = await pool.query(`SELECT id, url FROM questionsanswersschema.answers_photos WHERE answer_id = ${answersResult.rows[j].id}`)
        questionsResult.rows[i].answers[answersResult.rows[j].id].photos = answersPhotosResult.rows
      }
    }
    const result = { 'product_id': req.query.product_id, 'results': questionsResult.rows }
    res.send(result)
    res.status(200)
  } else {
    res.send('please include a product id')
  }
}

exports.getAnswers = async (req, res) => {
  res.status(200)
}
