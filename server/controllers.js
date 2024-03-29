const pool = require('./db.js')
require('dotenv').config()

exports.getQuestions = async (req, res) => {
  var startTime = performance.now();
  var count = 5;
  if (req.query.count) {
    count = req.query.count
  }
  if (req.query.product_id && Number(req.query.product_id)) {
    const questionsResult = await pool.query(`SELECT question_id, body, date_written, asker_name, asker_email, reported, helpfulness FROM ${process.env.SCHEMA}.questions WHERE product_id = ${req.query.product_id} LIMIT ${count}`)
    for (var i = 0; i < questionsResult.rows.length; i++) {
      questionsResult.rows[i].date_written = new Date(parseInt(questionsResult.rows[i].date_written)).toISOString();
      switch(questionsResult.rows[i].reported) {
        case 0:
          questionsResult.rows[i].reported = false;
          break;
        case 1:
          questionsResult.rows[i].reported = true;
          break;
      }
      const answersResult = await pool.query(`SELECT answer_id, body, date_written, answerer_name, reported, helpfulness FROM ${process.env.SCHEMA}.answers WHERE question_id = ${questionsResult.rows[i].question_id}`)
      questionsResult.rows[i].answers = {}
      for (var j = 0; j < answersResult.rows.length; j++) {
        answersResult.rows[j].date_written = new Date(parseInt(answersResult.rows[j].date_written)).toISOString();
        questionsResult.rows[i].answers[answersResult.rows[j].answer_id] = answersResult.rows[j]
        const answersPhotosResult = await pool.query(`SELECT photo_id, url FROM ${process.env.SCHEMA}.answers_photos WHERE answer_id = ${answersResult.rows[j].answer_id}`)
        questionsResult.rows[i].answers[answersResult.rows[j].answer_id].photos = answersPhotosResult.rows
      }
    }
    const result = {'product_id': req.query.product_id, 'results': questionsResult.rows}

    var endTime = performance.now();
    var time = ((endTime - startTime) / 1000).toFixed(3);
    console.log(`Data loaded from questions, time used: ${time} seconds`);
    res.send(result)
  } else {
    res.send('please include a product id')
  }
}

exports.getAnswers = async (req, res) => {

  var startTime = performance.now();

  var count = 5;
  if (req.query.count) {
    count = req.query.count
  }
  if (req.params.question_id && Number(req.params.question_id)) {
    const answersResult = await pool.query(`SELECT answer_id, body, date_written, answerer_name, reported, helpfulness FROM ${process.env.SCHEMA}.answers WHERE question_id = ${req.params.question_id} LIMIT ${count}`)
    for (var i = 0; i < answersResult.rows.length; i++) {
      switch(answersResult.rows[i].reported) {
        case 0:
          answersResult.rows[i].reported = false;
          break;
        case 1:
          answersResult.rows[i].reported = true;
          break;
      }
      const answersPhotosResult = await pool.query(`SELECT photo_id, url FROM ${process.env.SCHEMA}.answers_photos WHERE answer_id = ${answersResult.rows[i].answer_id}`)
      answersResult.rows[i].photos = answersPhotosResult.rows;
    }
    const result = {'question': req.params.question_id, 'page': 1, 'count': count, 'results': answersResult.rows}

    var endTime = performance.now();
    var time = ((endTime - startTime) / 1000).toFixed(3);
    console.log(`Data loaded from answers, time used: ${time} seconds`);

    res.send(result)
  } else {
    res.send('please enter a valid question id').status(200)
  }
}

exports.addQuestion = async (req, res) => {
  const lastQuestionID = await pool.query(`SELECT question_id FROM ${process.env.SCHEMA}.questions ORDER BY question_id DESC LIMIT 1`);
  const questionID = lastQuestionID.rows[0].question_id + 1;
  await pool.query(`INSERT INTO ${process.env.SCHEMA}.questions (question_id, product_id, body, date_written, asker_name, asker_email, reported, helpfulness) VALUES (${questionID}, '${req.body.product_id}', '${req.body.body}', ${Date.now()}, '${req.body.name}', '${req.body.email}', 0, 0)`).catch((err)=>{console.error('error adding answer, question id is probably invalid: ', err)})
  res.send('question works')
}

exports.addAnswer = async (req, res) => {
  const lastAnswerID = await pool.query(`SELECT answer_id FROM ${process.env.SCHEMA}.answers ORDER BY answer_id DESC LIMIT 1`);
  const answerID = lastAnswerID.rows[0].answer_id + 1;
  const validQuestionIDCheck = await pool.query(`SELECT * FROM ${process.env.SCHEMA}.questions WHERE question_id = ${req.params.question_id} LIMIT 1`);
  if (validQuestionIDCheck.rows.length === 0) {
    res.send('enter valid question id');
    return;
  }
  await pool.query(`INSERT INTO ${process.env.SCHEMA}.answers (answer_id, question_id, body, date_written, answerer_name, answerer_email, reported, helpfulness) VALUES (${answerID}, ${req.params.question_id}, '${req.body.body}', ${Date.now()}, '${req.body.name}', '${req.body.email}', 0, 0)`)
  for (var i = 0; i < req.body.photos.length; i++) {
    var lastPhotoID = await pool.query(`SELECT photo_id FROM ${process.env.SCHEMA}.answers_photos ORDER BY photo_id DESC LIMIT 1`);
    const photoID = await lastPhotoID.rows[0].photo_id + 1;
    await pool.query(`INSERT INTO ${process.env.SCHEMA}.answers_photos (photo_id, answer_id, url) VALUES (${photoID}, ${answerID}, '${req.body.photos[i]}')`);
  }
  res.send('question works')
}

exports.makeQuestionHelpful = async (req, res) => {
  await pool.query(`UPDATE ${process.env.SCHEMA}.questions SET helpfulness = helpfulness + 1 WHERE question_id = ${req.params.question_id}`)
  res.send('make question helpful works')
}

exports.reportQuestion = async (req, res) => {
  const currentReported = await pool.query(`SELECT reported FROM ${process.env.SCHEMA}.questions WHERE question_id = ${req.params.question_id}`)
  switch(currentReported.rows[0].reported) {
    case 0:
      await pool.query(`UPDATE ${process.env.SCHEMA}.questions SET reported = 1 WHERE question_id = ${req.params.question_id}`)
      res.send('reported question works')
      break;
    case 1:
      await pool.query(`UPDATE ${process.env.SCHEMA}.questions SET reported = 0 WHERE question_id = ${req.params.question_id}`)
      res.send('unreported question works')
      break;
  }
}

exports.makeAnswerHelpful = async (req, res) => {
  await pool.query(`UPDATE ${process.env.SCHEMA}.answers SET helpfulness = helpfulness + 1 WHERE answer_id = ${req.params.answer_id}`)
  res.send('make answer helpful works')
}

exports.reportAnswer = async (req, res) => {
  const currentReported = await pool.query(`SELECT reported FROM ${process.env.SCHEMA}.answers WHERE answer_id = ${req.params.answer_id}`)
  switch(currentReported.rows[0].reported) {
    case 0:
      await pool.query(`UPDATE ${process.env.SCHEMA}.answers SET reported = 1 WHERE answer_id = ${req.params.answer_id}`)
      res.send('reported question works')
      break;
    case 1:
      await pool.query(`UPDATE ${process.env.SCHEMA}.answers SET reported = 0 WHERE answer_id = ${req.params.answer_id}`)
      res.send('unreported question works')
      break;
  }
}
