/**
 * Created by ooooo on 2016/5/9.
 */
var express = require('express');
var querystring = require('querystring');
var url = require('url');
var https = require('https');
var fs = require("fs");
var router = express.Router();
var app = express();

function formUrlAttr(expr) {
    return 'https://oxfordhk.azure-api.net/academic/v1.0/evaluate?expr='+expr+'&count=10000&attributes=Id,AA.AuId,AA.AfId,F.FId,J.JId,C.CId,RId&subscription-key=f7cc29509a8443c5b3a5e56b0e38b5a6';
}

function formUrlAttrNoAfidRId(expr) {
    return 'https://oxfordhk.azure-api.net/academic/v1.0/evaluate?expr='+expr+'&count=10000&attributes=Id,AA.AuId,F.FId,J.JId,C.CId&subscription-key=f7cc29509a8443c5b3a5e56b0e38b5a6';
}

function formUrlAuId(Auid) {
    return formUrlAttr('Composite(AA.AuId='+Auid+')');
}

function formUrlAuIdAttrAARId(Auid) {
    return 'https://oxfordhk.azure-api.net/academic/v1.0/evaluate?expr=Composite(AA.AuId='+Auid+')&count=10000&attributes=Id,AA.AuId,AA.AfId,RId&subscription-key=f7cc29509a8443c5b3a5e56b0e38b5a6';
}

function formUrlAuidAttrAA(Auid) {
    return 'https://oxfordhk.azure-api.net/academic/v1.0/evaluate?expr=Composite(AA.AuId='+Auid+')&count=10000&attributes=Id,AA.AuId,AA.AfId&subscription-key=f7cc29509a8443c5b3a5e56b0e38b5a6';
}

function formUrlAuidAttrAANoId(Auid) {
    return 'https://oxfordhk.azure-api.net/academic/v1.0/evaluate?expr=Composite(AA.AuId='+Auid+')&count=10000&attributes=AA.AuId,AA.AfId&subscription-key=f7cc29509a8443c5b3a5e56b0e38b5a6';
}

function formUrlIdAttrAuidRId(Id) {
    return 'https://oxfordhk.azure-api.net/academic/v1.0/evaluate?expr=Id='+Id+'&count=10000&attributes=Id,AA.AuId,RId&subscription-key=f7cc29509a8443c5b3a5e56b0e38b5a6';
}

function formUrlIdNoAfid(Id) {
    return 'https://oxfordhk.azure-api.net/academic/v1.0/evaluate?expr=Id='+Id+'&count=10000&attributes=Id,AA.AuId,F.FId,J.JId,C.CId,RId&subscription-key=f7cc29509a8443c5b3a5e56b0e38b5a6';
}

function formUrlRidAttrAuid(Rid) {
    return 'https://oxfordhk.azure-api.net/academic/v1.0/evaluate?expr=RId='+Rid+'&count=10000&attributes=Id,AA.AuId&subscription-key=f7cc29509a8443c5b3a5e56b0e38b5a6';
}

function compareR(result, RIdlist, Id2, list) {
    var length = RIdlist.length;
    for (var i = 0; i < length; ++i){
        if (RIdlist[i]==Id2){
            result.push(list);
            break;
        }
    }
}

function compareRlist(result, RIdlist1, RIdlist2, startlist, endlist) {
    var length = RIdlist2.length;
    var rid;
    while(length--){
        rid = RIdlist2[length];
        compareR(result, RIdlist1, rid, startlist.concat([rid], endlist))
    }
}

function compareFJC(result, entity1, entity2, startlist, endlist){
    if (entity1.F != undefined && entity2.F != undefined){
        var F1 = entity1.F;
        var F2 = entity2.F;
        var length1 = F1.length;
        var length2 = F2.length;
        var FId1;
        var FId2;
        while(length1--){
            FId1 = F1[length1].FId;
            length2 = F2.length;
            while(length2--){
                FId2 = F2[length2].FId;
                if (FId1 == FId2){
                    result.push(startlist.concat([FId1], endlist))
                }
            }
        }
    }
    if (entity1.J != undefined && entity2.J != undefined){
        var JId1 = entity1.J.JId;
        var JId2 = entity2.J.JId;
        if (JId1 == JId2){
            result.push(startlist.concat([JId1], endlist))
        }
    }
    if (entity1.C != undefined && entity2.C != undefined){
        var CId1 = entity1.C.CId;
        var CId2 = entity2.C.CId;
        if (CId1 == CId2){
            result.push(startlist.concat([CId1], endlist))
        }
    }
}

function compareFJCA(result, entity1, entity2, startlist, endlist) {
    compareFJC(result, entity1, entity2, startlist, endlist);
    var AA1 = entity1.AA;
    var AA2 = entity2.AA;
    var length1 = AA1.length;
    var length2 = AA2.length;
    var AuId1;
    var AuId2;
    for (var i = 0; i < length1; ++i){
        AuId1 = AA1[i].AuId;
        for (var j = 0; j < length2; ++j){
            AuId2 = AA2[j].AuId;
            if (AuId1 == AuId2){
                result.push(startlist.concat([AuId1], endlist));
                break;
            }
        }
    }
}

function compareA(result, entity, Auid2, list) {
    var AA1 = entity.AA;
    var AA1_length = AA1.length;
    var Auid1;
    while(AA1_length--){
        Auid1 = AA1[AA1_length].AuId;
        if (Auid1 == Auid2){
            result.push(list);
            break;
        }
    }
}

function compareAf(result, field1, field2, startlist, endlist) {
    var length1 = field1.length;
    var length2 = field2.length;
    for (var i = 0; i < length1; ++i){
        for (var j = 0; j < length2; ++j){
            if (field1[i] == field2[j]){
                result.push(startlist.concat([field1[i]], endlist));
            }
        }
    }
}

function compareId(result, Idlist1, Idlist2, startlist, endlist) {
    compareAf(result, Idlist1, Idlist2, startlist, endlist);
}

function counter(cnt, result, Id1, Id2, RIdlist, Reference, Idlist, Callback) {
    if (cnt == 0){
        var length = Idlist.length;
        while(length--){
            var id = Idlist[length];
            compareR(result, RIdlist, id, [Id1, id, Id2]);
            compareRlist(result, RIdlist, Reference[id], [Id1, id], [Id2]);
        }
        Callback(result);
    }
}

function counter_2(cnt, result, Id1, AA, Authors, field2, AuId2, RIdlist, Reference, Idlist, Callback) {
    if (cnt == 0){
        var length = Idlist.length;
        // 3-hop 3.1
        var RId;
        while(length--){
            RId = Idlist[length];
            compareRlist(result, RIdlist, Reference[RId], [Id1, RId], [AuId2]);
        }
        length = AA.length;
        var AuId;
        // 3-hop 3.3
        while(length--){
            AuId = AA[length].AuId;
            compareAf(result, Authors[AuId], field2, [Id1, AuId], [AuId2]);
        }
        Callback(result);
    }
}

function counter_3(cnt, result, Id2, AA, Authors, field1, AuId1, RIdlist, Reference, Idlist, Callback) {
    if (cnt == 0){
        var length = Idlist.length;
        // 3-hop 3.1
        var RId;
        while(length--){
            RId = Idlist[length];
            compareRlist(result, RIdlist, Reference[RId], [AuId1, RId], [Id2]);
        }
        // 3-hop 3.3
        length = AA.length;
        var AuId;
        while(length--){
            AuId = AA[length].AuId;
            compareAf(result, field1, Authors[AuId], [AuId1], [AuId, Id2]);
        }
        Callback(result);
    }
}

function counter_4(cnt, Auid1, Auid2, field1, field2, Idlist1, Idlist2, IdRId, Callback) {
    if (cnt == 0){
        var result = [];
        // 2-hop 2.1
        compareAf(result, field1, field2, [Auid1], [Auid2]);
        // 2-hop 2.2
        compareId(result, Idlist1, Idlist2, [Auid1], [Auid2]);
        // 2-hop 3.1
        var length = Idlist1.length;
        var Id;
        while(length--){
            Id = Idlist1[length];
            compareId(result, IdRId[Id], Idlist2, [Auid1, Id], [Auid2]);
        }
        Callback(result);
    }
}

function addunique(array, item) {
    var length = array.length;
    var unique = true;
    while(length--){
        if (array[length]==item){
            unique = false;
            break;
        }
    }
    if (unique){
        array.push(item);
    }
}

function searchAforadd(entity, field, Auid2) {
    var AA = entity.AA;
    var AA_length = AA.length;
    for (var j = 0; j < AA_length; ++j){
        if (AA[j].AuId == Auid2 && AA[j].AfId != undefined){
            addunique(field, AA[j].AfId);
        }
    }
}

function handleAuId1_AuId2(Auid1, Auid2, Callback){
    console.log("enter Auid_1->Auid_2");

    // 2-hop
    var field1 = [];
    var Idlist1 = [];
    var IdRId = {};
    var field2 = [];
    var Idlist2 = [];

    var cnt = 1;
    https.get(formUrlAuIdAttrAARId(Auid1), function (response) {
        var body = '';
        response.on('data', function (data) {
            body += data;
        });
        response.on('end', function () {
            var res_json = JSON.parse(body);
            var entities = res_json.entities;
            var length = entities.length;
            var entity;
            var Id;
            while (length--){
                entity = entities[length];
                Id = entity.Id;
                searchAforadd(entity, field1, Auid1);
                Idlist1.push(Id);
                IdRId[Id] = entity.RId;
            }
            counter_4(--cnt, Auid1, Auid2, field1, field2, Idlist1, Idlist2, IdRId, Callback);
        });
    });


    cnt += 1;
    https.get(formUrlAuidAttrAA(Auid2), function (response) {
        var body = '';
        response.on('data', function (data) {
            body += data;
        });
        response.on('end', function () {
            var res_json = JSON.parse(body);
            var entities = res_json.entities;
            var length = entities.length;
            var entity;
            while (length--){
                entity = entities[length];
                searchAforadd(entity, field2, Auid2);
                Idlist2.push(entity.Id);
            }
            counter_4(--cnt, Auid1, Auid2, field1, field2, Idlist1, Idlist2, IdRId, Callback);
        });
    });

}

function handleAuId1_Id2(entiey1, entity2, Callback) {
    console.log("enter AuId_1->Id_2");
    var result = [];
    var Auid1 = entiey1.Id;
    var Id2 = entity2.Id;
    var field1 = [];
    var Authors = {};
    var AA = entity2.AA;
    var Reference = {};
    var Idlist = [];

    // 1-hop 1.1
    compareA(result, entity2, Auid1, [Auid1, Id2]);

    // 2-hop 2.1
    var cnt = 1;
    var RIdlist = [];
    https.get(formUrlRidAttrAuid(Id2), function (response) {
        var body ='';
        response.on('data', function (data) {
            body += data;
        });
        response.on('end', function () {
            var res_json = JSON.parse(body);
            var entities = res_json.entities;
            var length = entities.length;
            var entity;
            for (var i = 0; i < length; ++i){
                entity = entities[i];
                RIdlist.push(entity.Id);
                compareA(result, entity, Auid1, [Auid1, entity.Id, Id2]);
            }
            counter_3(--cnt, result, Id2, AA, Authors, field1, Auid1, RIdlist, Reference, Idlist, Callback);
        });
    });

    // 3-hop
    cnt += 1;
    https.get(formUrlAuId(Auid1), function (response) {
        var body ='';
        response.on('data', function (data) {
            body += data;
        });
        response.on('end', function () {
            var res_json = JSON.parse(body);
            var entities = res_json.entities;
            var length = entities.length;
            for (var i = 0; i < length; ++i){
                entity = entities[i];
                var id = entity.Id;
                // 3-hop 3.2
                compareFJCA(result, entity, entity2, [Auid1, id], [Id2]);
                // 3-hop 3.1
                Reference[id] = entity.RId;
                Idlist.push(id);
                // 3-hop 3.3
                searchAforadd(entity, field1, Auid1);
            }

            counter_3(--cnt, result, Id2, AA, Authors, field1, Auid1, RIdlist, Reference, Idlist, Callback);
        });
    });

    // 3-hop 3.3
    var AA_length = AA.length;
    var Auid;
    cnt += AA_length;
    for (var j = 0; j < AA_length; ++j){
        Auid = AA[j].AuId;
        Authors[Auid] = [];
        https.get(formUrlAuidAttrAANoId(Auid), function (response) {
            var body = '';
            response.on('data', function (data) {
                body += data;
            });
            response.on('end', function () {
                var res_json = JSON.parse(body);
                var entities = res_json.entities;
                var length = entities.length;
                var entity;
                while(length--){
                    entity = entities[length];
                    searchAforadd(entity, Authors[Auid], Auid);
                }

                counter_3(--cnt, result, Id2, AA, Authors, field1, Auid1, RIdlist, Reference, Idlist, Callback);
            });
        });
    }
}

function handleId1_AuId2(entity1, entity2, Callback) {
    console.log("enter Id_1->AuId_2");
    var result = [];
    var Id1 = entity1.Id;
    var Auid2 = entity2.Id;
    var Authors = {};
    var AA = entity1.AA;
    var field2 = [];
    var RIdlist = [];
    var Reference = {};

    // 1-hop 1.1
    compareA(result, entity1, Auid2, [Id1, Auid2]);

    // 2-hop
    var RId = entity1.RId;
    var Rlength = RId.length;
    var cnt = Rlength;
    for (var i = 0; i < Rlength; ++i){
        https.get(formUrlIdAttrAuidRId(RId[i]), function (response) {
            var body = '';
            response.on('data', function(data) {
                body += data;
            });
            response.on('end', function() {
                var res_json = JSON.parse(body);
                var Rentity = res_json.entities[0];
                var id = Rentity.id;
                // 3-hop 3.1
                Reference[id] = Rentity.RId;
                // 2-hop 2.1
                compareA(result, Rentity, Auid2, [Id1, id, Auid2]);

                counter_2(--cnt, result, Id1, AA, Authors, field2, Auid2, RIdlist, Reference, RId, Callback);
            });
        });
    }

    // 3-hop

    cnt += 1;
    https.get(formUrlAuId(Auid2), function (response) {
        var body = '';
        response.on('data', function (data) {
            body += data;
        });
        response.on('end', function () {
            var res_json = JSON.parse(body);
            var entities = res_json.entities;
            var length = entities.length;
            var entity;
            while (length--){
                entity = entities[length];
                var id = entity.Id;
                // 3-hop 3.1
                RIdlist.push(id);
                // 3-hop 3.2
                compareFJCA(result, entity1, entity, [Id1], [id, Auid2]);
                // 3-hop 3.3
                searchAforadd(entity, field2, Auid2);
            }
            counter_2(--cnt, result, Id1, AA, Authors, field2, Auid2, RIdlist, Reference, RId, Callback);
        });
    });

    // 3-hop 3.3
    var AA_length = AA.length;
    var Auid;
    cnt += AA_length;
    for (var j = 0; j < AA_length; ++j){
        Auid = AA[j].AuId;
        Authors[Auid] = [];
        https.get(formUrlAuidAttrAANoId(Auid), function (response) {
            var body = '';
            response.on('data', function (data) {
                body += data;
            });
            response.on('end', function () {
                var res_json = JSON.parse(body);
                var entities = res_json.entities;
                var length = entities.length;
                var entity;
                while(length--){
                    entity = entities[length];
                    searchAforadd(entity, Authors[Auid], Auid);
                }
                counter_2(--cnt, result, Id1, AA, Authors, field2, Auid2, RIdlist, Reference, RId, Callback);
            });
        });
    }
}

function handleId1_Id2(entity1, entity2, Callback) {
    console.log("enter Id1_1=->Id_2");
    var result = [];
    var Id1 = entity1.Id;
    var Id2 = entity2.Id;
    var Reference = {};
    // 1-hop 1.1
    compareR(result, entity1.RId, Id2, [Id1, Id2]);

    // 2-hop 2.1
    compareFJCA(result, entity1, entity2, [Id1], [Id2]);

    var RIdlist = [];
    var RId1 = entity1.RId;
    var cnt = 1;
    https.get(formUrlAttrNoAfidRId('RId='+Id2), function (response) {
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
                // 2-hop 2.2
                RIdlist.push(entity.Id);
                // 3-hop 3.2
                compareFJCA(result, entity1, entity, [Id1], [entity.Id, Id2]);
            }

            counter(--cnt, result, Id1, Id2, RIdlist, Reference, RId1, Callback);
        });
    });

    var length = RId1.length;
    for (var i = 0; i < length; ++i){
        if (RId1[i] != Id2){
            cnt += 1;
            https.get(formUrlIdNoAfid(RId1[i]), function (response) {
                var body = '';
                response.on('data', function(data) {
                    body += data;
                });
                response.on('end', function() {
                    var res_json = JSON.parse(body);
                    var Rentity = res_json.entities[0];
                    // 3-hop 3.1
                    var id = Rentity.Id;
                    Reference[id] = Rentity.RId;
                    compareFJCA(result, Rentity, entity2, [Id1, id], [Id2]);
                    counter(--cnt, result, Id1, Id2, RIdlist, Reference, RId1, Callback);
                });
            });
        }else{
            Reference[Id2] = entity2.RId;
            compareFJCA(result, entity2, entity2, [Id1, Id2], [Id2]);
        }
    }
}

function handle(resjson1, resjson2, Callback) {
    var entity1 = resjson1.entities[0];
    var entity2 = resjson2.entities[0];
    if (entity1.AA == undefined){
        if (entity2.AA == undefined){
            handleAuId1_AuId2(entity1.Id, entity2.Id, Callback);
        }else{
            handleAuId1_Id2(entity1, entity2, Callback);
        }
    }else{
        if (entity2.AA == undefined){
            handleId1_AuId2(entity1, entity2, Callback);
        }else{
            handleId1_Id2(entity1, entity2, Callback);
        }
    }
}

function cb(cnt, resjson1, resjson2, Callback) {
    if (cnt == 0){
        handle(resjson1, resjson2, Callback);
    }
}

router.get('/case', function (req, res) {
    var query = querystring.parse(url.parse(req.url).query);
    var id1 = query['id1'];
    var id2 = query['id2'];
    var res_json1;
    var res_json2;
    var cnt = 2;
    https.get(formUrlIdNoAfid(id1), function (response) {
        var body = '';
        response.on('data', function(data) {
            body += data;
        });
        response.on('end', function() {
            res_json1 = JSON.parse(body);
            cb(--cnt, res_json1, res_json2, function (data) {
                res.json(data);
            });
        });
    });
    https.get(formUrlIdNoAfid(id2), function (response2) {
        var body2 = '';
        response2.on('data', function(data) {
            body2 += data;
        });
        response2.on('end', function () {
            res_json2 = JSON.parse(body2);
            cb(--cnt, res_json1, res_json2, function (data) {
                res.json(data);
            });
        });
    });
});

app.use('/', router);

app.listen(80);