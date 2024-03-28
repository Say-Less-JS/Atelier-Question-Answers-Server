const { Pool } = require('pg');
const path = require('path');
require('dotenv').config()


const client = new Pool ({
  user: process.env.USERNAME,
  host: process.env.HOST,
  database: process.env.DB_NAME,
  password: process.env.PASSWORD,
  port: process.env.PORT
});


const createDB = async function () {

  const createSchemaAndTables = async function () {
    client.query('CREATE SCHEMA IF NOT EXISTS QuestionsAnswersSchema')
    await client.query('CREATE TABLE IF NOT EXISTS QuestionsAnswersSchema.answers (id BIGINT, question_id BIGINT, body VARCHAR, date_written BIGINT, answerer_name VARCHAR, answerer_email VARCHAR, reported BIGINT, helpfulness BIGINT)');
    await client.query('CREATE TABLE IF NOT EXISTS QuestionsAnswersSchema.questions (id BIGINT, product_id BIGINT, body VARCHAR, date_written BIGINT, asker_name VARCHAR, asker_email VARCHAR, reported BIGINT, helpfulness BIGINT)');
    await client.query('CREATE TABLE IF NOT EXISTS QuestionsAnswersSchema.answers_photos (id BIGINT, answer_id BIGINT, url VARCHAR)');
  }

  const loadQuestionData = async function () {
    const questionsPath = '../temp/questions.csv'
    await client.query(`Copy QuestionsAnswersSchema.questions(id, product_id, body, date_written, asker_name, asker_email, reported, helpfulness) FROM '${questionsPath}' DELIMITER ',' CSV HEADER`, (err, callback)=>{if (err) {
      console.log('error: ', err)
    } else {
      console.log('data loaded to questions table')
    }})
  }
  const loadAnswerData = async function () {
    const answersPath = '../temp/answers.csv'
    await client.query(`Copy QuestionsAnswersSchema.answers(id, question_id, body, date_written, answerer_name, answerer_email, reported, helpfulness) FROM '${answersPath}' DELIMITER ',' CSV HEADER`, (err, callback)=>{if (err) {
      console.log('error: ', err)
    } else {
      console.log('data loaded to answers table')
    }})
  }
  const loadAnswersPhotosData = async function () {
    const answers_photosPath = '../temp/answers_photos.csv'
    await client.query(`Copy QuestionsAnswersSchema.answers_photos(id, answer_id, url) FROM '${answers_photosPath}' DELIMITER ',' CSV HEADER`, (err, callback)=>{if (err) {
      console.log('error: ', err)
    } else {
      console.log('data loaded to answers_photos table')
      // client.release()
      // pool.end()
//! ^^ FIGURE OUT THE DIFFERENCE BETWEEN THESE TWO ^^
    }})
  }


  createSchemaAndTables().then(async ()=>{
    var isQTableEmpty = await client.query('SELECT * FROM questionsanswersschema.questions WHERE id = 1')
    var isATableEmpty = await client.query('SELECT * FROM questionsanswersschema.answers WHERE id = 1')
    var isAPTableEmpty = await client.query('SELECT * FROM questionsanswersschema.answers_photos WHERE id = 1')

    if (isQTableEmpty.rows.length === 0 && isATableEmpty.rows.length === 0 && isAPTableEmpty.rows.length === 0) {
      try {
      await loadQuestionData();
      await loadAnswerData();
      await loadAnswersPhotosData();
      } catch (error) {
        console.log('error: ', error)
      }
    }
  })
}

createDB()
