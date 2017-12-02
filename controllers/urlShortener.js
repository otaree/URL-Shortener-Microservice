// mongodb client
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/mydb";
var async = require('async');

function checkUrl(url) {
    if (url.indexOf('new') === 1) {
        var regex = /(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/g;
        var match = url.match(regex);
        if (match) {
            return match[0];
        }

    }
    return false;
}



module.exports = function (app) {

    app.get("/:id", function (req, res) {
        var userUrl = req.params.id;
        if (isNaN(userUrl)) {
            res.json({
                "error": "Please provide correct url"
            });
        } else {
            MongoClient.connect(url, function (err, db) {
                if (err) throw err;
                db.collection("website").find({
                    "short_url": 6
                }).toArray(function (err, result) {
                    if (err) throw err;
                    if (result.length > 0) {
                        var address = result[0]["address"];
                        db.close();
                        res.redirect(301, address);

                    } else {
                        db.close();
                        res.json({
                            "error": "Please provide correct url"
                        });
                    }

                });
            });
        }


    });

    app.get("*", (req, res) => {
        var websiteShort;
        var obj;
        var userUrl = checkUrl(req.url);
        if (userUrl) {
            MongoClient.connect(url, function (err, db) {
                if (err) throw err;
                db.collection("website").find({
                    address: userUrl
                }).toArray(function (err, result) {
                    if (err) throw err;
                    if (result.length > 0) {
                        obj = {
                            "orginal_url": req.get('host')+ '/'+result[0]["address"],
                            "short_url":  req.get('host')+ '/'+result[0]["short_url"]
                        };
                        db.close();
                        res.json(obj);
                    } else {

                        async.series([
                                function (callback) {
                                    // do some stuff ...
                                    db.collection("website").find({}).sort({
                                        _id: -1
                                    }).toArray(function (err, nresult) {
                                        if (err) throw err;
                                        if (nresult.length === 0) {
                                            websiteShort = 100;
                                        } else {
                                            websiteShort = isNaN(nresult[0]["short_url"]) ? 200 : nresult[0]["short_url"];
                                        }
                                        callback(null, 'one');
                                    });

                                },
                                function (callback) {
    
                                    websiteShort = websiteShort+ Math.floor(Math.random() * 100 + 1);

                                    db.collection("website").insert({
                                        "address": userUrl,
                                        "short_url": websiteShort
                                    }, function (err, res) {
                                        if (err) throw err;
                                        callback(null, 'two');
                                    });
                                }
                            ],
                            // optional callback
                            function (err, results) {
                                // results is now equal to ['one', 'two']
                                if (err) console.log("error", err);

                                obj = {
                                    "orginal_url": req.get('host')+ '/' +userUrl,
                                    "short_url": req.get('host')+ '/'  +websiteShort
                                };
                                db.close();
                                res.json(obj);
                            });

                    }
                });

            });
        } else {
            res.json({
                "error": "Please provide correct url"
            });
        }
    });
};