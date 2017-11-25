const _ = require('lodash');
const request = require('request');
const colors = require('colors/safe');
const auth = require('./auth');
const HI_URL = 'https://hi.service-now.com/api/now/globalsearch/search';
const TASK = '8c58a5aa0a0a0b07008047e8ef0fe07d';
const PRB = 'problem';
const STRY = 'story';
const INT = 'incident';

colors.setTheme({
    info: 'green'
});

const prettyDisplay = (description) => {
    var branch = (description.active) ? colors.info(['*', description.branch].join(' ')) : description.branch
    console.log('%s - %s', branch, description.label);
}

const infoObj = (task, label = 'No STRY/PRB/INT attached to this branch') => {
    return Object.assign(task, { label });
}

const taskObj = (branch, task = null, table = null) => {
    return Object.assign(branch, {task, table});
}

const getRecord = (branchObj) => {
    let task = branchObj.branch.match(/(PRB[\d]+)/g);
    let table = PRB;

    if (!task) {
        task = branchObj.branch.match(/(STRY[\d]+)/g);
        table = STRY;
    }

    if (!task) {
        task = branchObj.branch.match(/(INT[\d]+)/g);
        table = INT;
    }

    if (!task)
        return taskObj(branchObj);

    return taskObj(branchObj, task[0], table);
}

const hi = {
    sendAjax: function (taskObj) {
        return new Promise((resolve, reject) => {
            var { task, table } = taskObj
            if (!task)
                return resolve(infoObj(taskObj));

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
                            return resolve(infoObj(taskObj));

                        var record = records.filter(r => r.data.number.value === task)[0];
                        var label = record.metadata.title;

                        return resolve(infoObj(taskObj, label));
                    });
                })
                .catch(reject);
        });
    },
    describe: function(branches) {
        return new Promise(function(resolve, reject) {
            var tasks = branches.map(getRecord);
            var info = tasks.map(hi.sendAjax);
            Promise.all(info)
                .then(descriptions => {
                    descriptions.forEach(description => {
                        prettyDisplay(description);
                    });
                    resolve();
                })
                .catch(reject)
        });
    }
}

module.exports = hi;
