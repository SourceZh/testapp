/**
 * Created by ooooo on 2016/5/9.
 */
var express = require('express');
var querystring = require('querystring');
var url = require('url');
var http = require('http');
var app = express();

function formUrlAttr(expr) {
    return 'https://oxfordhk.azure-api.net/academic/v1.0/evaluate?expr='+expr+'&count=10000&attributes=Id,AA.AuId,AA.AfId,F.FId,J.JId,C.CId,RId&subscription-key=f7cc29509a8443c5b3a5e56b0e38b5a6';
}

function formUrlId(Id) {
    return formUrlAttr('Id='+Id);
}

function compareR(result, entity, startlist, endlist) {
    var Id2 = endlist[0];
    var RId = entity.RId;
    var length = RId.length;
    for (var i = 0; i < length; ++i){
        if (RId[i]==Id2){
            result.push(startlist.concat(endlist));
            break;
        }
    }
}

function compareFJC(result, entity1, entity2, startlist, endlist){
    var array;
    if (entity1.F != undefined && entity2.F != undefined){
        var FId1 = entity1.F.FId;
        var FId2 = entity2.F.FId;
        if (FId1 == FId2){
            array = startlist.slice();
            array.push(FId1);
            result.push(array.concat(endlist))
        }
    }
    if (entity1.J != undefined && entity2.J != undefined){
        var JId1 = entity1.J.JId;
        var JId2 = entity2.J.JId;
        if (JId1 == JId2){
            array = startlist.slice();
            array.push(JId1);
            result.push(array.concat(endlist))
        }
    }
    if (entity1.C != undefined && entity2.C != undefined){
        var CId1 = entity1.C.JId;
        var CId2 = entity2.C.JId;
        if (CId1 == CId2){
            array = startlist.slice();
            array.push(CId1);
            result.push(array.concat(endlist))
        }
    }
}

function compareFJCA(result, entity1, entity2, startlist, endlist) {
    var array;
    compareFJC(result, entity1, entity2);
    var AA1 = entity1.AA;
    var AA2 = entity2.AA;
    var length1 = AA1.length;
    var length2 = AA2.length;
    while(length1--){
        length2 = AA2.length;
        while(length2--){
            if (AA1[length1] == AA2[length2]){
                array = startlist.slice();
                array.push(AA1[length1]);
                result.push(array.concat(endlist));
                break;
            }
        }
    }
}

function handleAuId1_AuId2(auid1, auid2){

}

function handleAuId1_Id2() {
    
}

function handleId1_AuId2() {
    
}

function handleId1_Id2(entity1, entity2) {
    var result = [];
    var Id1 = entity1.Id;
    var Id2 = entity2.Id;
    // 1-hop
    compareR(result, entity1, [Id1], [Id2]);

    // 2-hop
    compareFJCA(result, entity1, entity2, [Id1], [Id2]);

    var RId = entity1.RId;
    var length = RId.length;
    var state = length+1;
    for (var i = 0; i < length; ++i){
        http.get(formUrlId(Rid[i]), function (response) {
            var body = '';
            response.on('data', function(data) {
                body += data;
            });
            response.on('end', function() {
                var res_json = JSON.parse(body);
                var Rentity = res_json.entities[0];

                // 2-hop
                compareR(result, Rentity, [Id1, Rentity.Id], [Id2]);

                // 3-hop
                compareFJCA(result, Rentity, entity2, [Id1, Rentity.Id], [Id2]);
                state--;
            });
        })
    }
    http.get(formUrlAttr('Rid='+Id2), function (response) {
        var body = '';
        response.on('data', function(data) {
            body += data;
        });
        response.on('end', function() {
            var res_json = JSON.parse(body);
            var entities = res_json.entities;
            var length = entities.length;
            var entity;
            for (var i = 0; i < length; ++i){
                entity = entities[i];
                compareFJCA(result, entity1, entity, [Id1], [entity.Id, Id2]);
            }
            state--;
        });
    });
    while(state){

    }
    return result;
}

function handle(resjson1, resjson2, Callback) {
    var entity1 = resjson1.entities[0];
    var entity2 = resjson2.entities[0];
    if (entity1.AA == undefined){
        if (entity2.AA == undefined){
            handleAuId1_AuId2(entity1.Id, entity2.Id);
        }else{
            handleAuId1_Id2(entity1.Id, entity2.Id);
        }
    }else{
        if (entity2.AA == undefined){
            handleId1_AuId2(entity1.Id, entity2.Id);
        }else{
            Callback(handleId1_Id2(entity1, entity2));
        }
    }
}

app.get('/case', function (res, req) {
    var query = querystring.parse(url.parse(req.url).query);
    var id1 = query['id1'];
    var id2 = query['id2'];
    http.get(formUrlId(id1), function (response) {
        var body = '';
        response.on('data', function(data) {
            body += data;
        });
        response.on('end', function() {
            var res_json1 = JSON.parse(body);
            http.get(formUrlId(id2), function (response2) {
                var body2 = '';
                response2.on('data', function(data) {
                    body2 += data;
                });
                response2.on('end', function () {
                    var res_json2 = JSON.parse(body2);
                    handle(res_json1, res_json2, function (data) {
                        res.json(data);
                    });
                });
            });
        });
    });
});

app.listen(80);