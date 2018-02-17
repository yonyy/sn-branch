const request = require('request');
const auth = require('./auth');
const HI_URL = 'https://hi.service-now.com/api/now/globalsearch/search';
const TASK = '8c58a5aa0a0a0b07008047e8ef0fe07d';

const api = {
    sendGlobalSearchRequest: function (taskObj) {
        return new Promise((resolve, reject) => {
            var { task, table } = taskObj
            if (!task)
                return resolve(null);

            auth.readAuth()
                .then(config => {
                    var options = {
                        url: HI_URL,
                        qs: {
                            sysparm_search: task,
                            sysparm_groups: TASK
                        },
                        headers: {
                            'Authorization' : 'Basic ' + config.auth
                        }
                    }

                    return request(options, (err, res, body) => {
                        var parsedBody = JSON.parse(body);
                        if (err)
                            return reject(err.message);

                        if (parsedBody.error)
                            return reject(parsedBody.error.message);

                        var records = parsedBody.result.groups[0]
                                    .search_results
                                    .filter(v => v.name === table)[0]
                                    .records;

                        if (!records)
                            return resolve(null);

                        var record = records.filter(r => r.data.number.value === task)[0];
                        var label = record.metadata.title;

                        return resolve(label);
                    });
                })
                .catch(reject);
        });
    }
}

module.exports = api;