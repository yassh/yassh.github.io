/* eslint-disable import/no-extraneous-dependencies, no-shadow, no-console */

const fs = require('fs');
const glob = require('glob');
const validator = require('html-validator');

glob('./*.html', (err, files) => {
  if (err) throw err;

  files.forEach((file) => {
    fs.readFile(file, 'utf8', (err, html) => {
      if (err) throw err;

      validator({ data: html, format: 'text' }).then((data) => {
        console.log(data); // XXX
      })
      .catch((err) => {
        console.error(err);
      });
    });
  });
});
