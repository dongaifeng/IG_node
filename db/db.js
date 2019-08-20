
var mssql = require('mssql');

var connConfig = {
    user:  'sa',  
    password:  'passw0rd!',  
    server:  '192.168.1.66',
    port: 1433,   
    database:  'MY_TEST',
    connectionTimeout: 120000,
    requestTimeout: 3000000,
    retryTimes: 3,
    options: {
        encrypt: true
    },
    pool: {
        max: 1024,
        min: 1,
        idleTimeoutMillis: 30000
    }
};

mssql.on('error', err => {
    // ... error handler
    if (err) {
        throw err;
    }
});

let connectionPool;

//连接数据库
var getConnection = async function(){
    if(!(connectionPool && connectionPool.connected)) {
        connectionPool = await mssql.connect(connConfig);
    }
    return connectionPool;
}

var querySql = async function (sql, params) {//写sql语句自由查询
    await mssql.close();// close
    var pool = await getConnection();
    var request = pool.request();
    if (params) {
        for (var index in params) {
            if (typeof params[index] == "number") {
                request.input(index, mssql.Int, params[index]);
            } else if (typeof params[index] == "string") {
                request.input(index, mssql.NVarChar, params[index]);
            }
        }
    }
    var result = await request.query(sql);
    await mssql.close();// close
    return result;
};


var select = async function (tableName, topNumber, whereSql, params, orderSql) {
    try{
        await mssql.close();// close
        var pool = await getConnection();
        var request = pool.request();

        var sql = "select * from " + tableName + " ";
        if (topNumber != "") {
            sql = "select top(" + topNumber + ") * from " + tableName + " ";
        }
        sql += whereSql + " ";
        if (params != "") {
            for (var index in params) {
                if (typeof params[index] == "number") {
                    ps.input(index, mssql.Int);
                } else if (typeof params[index] == "string") {
                    ps.input(index, mssql.NVarChar);
                }
            }
        }
        sql += orderSql;
        console.log(sql);

        var result = await request.query(sql);
        await mssql.close();// close
        return result;
     
    }catch(err){
        console.error('SQL error', err);
    }
};
 
var add = async function (addObj, tableName) {//添加数据
    if(!addObj){
        return;
    }    
    await mssql.close();// close
    var connection = await getConnection();
    var request = connection.request();

    var sql = "insert into " + tableName + "(";
    for (var index in addObj) {
        if (typeof addObj[index] == "number") {
            request.input(index, mssql.Int, addObj[index]);
        } else if (typeof addObj[index] == "string") {
            request.input(index, mssql.NVarChar, addObj[index]);
        }
        sql += index + ",";
    }
    sql = sql.substring(0, sql.length - 1) + ") values(";
    for (var index in addObj) {
        if (typeof addObj[index] == "number") {
            sql += "@" + index + ",";
        } else if (typeof addObj[index] == "string") {
            sql += "@" + index + ",";
        }
    }
    sql = sql.substring(0, sql.length - 1) + ")";

    var result = await request.query(sql);
    await mssql.close();// close
    return result;
};

var addIfNotExist = async function (addObj, whereObj, tableName) {//添加数据
    if(!addObj){
        return;
    }
    if(!whereObj){
        return await add(addObj, tableName);
    }
    await mssql.close();// close
    var connection = await getConnection();
    var request = connection.request();

    let sql = `BEGIN
    IF NOT EXISTS (SELECT 1 FROM ${tableName} WHERE 1 > 0`;

    for(var index in whereObj){
        if (typeof addObj[index] == "number") {
            request.input(index+'Where', mssql.Int, whereObj[index]);
        } else if (typeof addObj[index] == "string") {
            request.input(index+'Where', mssql.NVarChar, whereObj[index]);
        }
        sql += ` AND ${index} = @${index}Where`
    }
    sql+= ')';

    sql += 'BEGIN ';
    sql += "INSERT INTO " + tableName + "(";
    for (var index in addObj) {
        if (typeof addObj[index] == "number") {
            request.input(index, mssql.Int, addObj[index]);
        } else if (typeof addObj[index] == "string") {
            request.input(index, mssql.NVarChar, addObj[index]);
        }
        sql += index + ",";
    }
    sql = sql.substring(0, sql.length - 1) + ") values(";
    for (var index in addObj) {
        if (typeof addObj[index] == "number") {
            sql += "@" + index + ",";
        } else if (typeof addObj[index] == "string") {
            sql += "@" + index + ",";
        }
    }
    sql = sql.substring(0, sql.length - 1) + ")";

    sql += `   END
    END`;

    var result = await request.query(sql);
    await mssql.close();// close
    return result;
};


var addList = async function (addObjs, tableName) {//添加数据
    if(!addObjs || addObjs.length == 0){
        return;
    }
    await mssql.close();// close
    var connection = await getConnection();
    var sql = "INSERT INTO " + tableName + "(";
    if (addObjs) {
        let addObj = addObjs[0];
        for (var index in addObj) {
            sql += index + ",";
        }
        sql = sql.substring(0, sql.length - 1) + ") VALUES";
        addObjs.forEach(addObj => {
            sql = sql + "(";
            for (var index in addObj) {
                if (typeof addObj[index] == "number") {
                    sql += addObj[index] + ",";
                } else if (typeof addObj[index] == "string") {
                    sql += "N'" + addObj[index] + "'" + ",";
                }
            }
            sql = sql.substring(0, sql.length - 1) + "),";
        });
    }
    sql = sql.substring(0, sql.length - 1);
    // logger.info(sql);
    var result = await connection.request().query(sql);
    await mssql.close();// close
    return result;
};

var addListIfNotExist = async function (addObjs, uniqueFieldName, tableName) {//添加数据
    if(!addObjs || addObjs.length == 0){
        return;
    }
    await mssql.close();// close
    var connection = await getConnection();
    let addObj = addObjs[0];
    let sql = `
      CREATE TABLE #${tableName}Temp(
    `;

    for (var index in addObj) {
        if (typeof addObj[index] == "number") {
            sql += index + " BIGINT,";
        } else if (typeof addObj[index] == "string") {
            sql += index + " NVARCHAR(MAX),";
        }
    }
    sql = sql.substring(0, sql.length - 1) + ");";


    sql += "INSERT INTO #" + tableName + "Temp(";
    if (addObjs) {
        for (var index in addObj) {
            sql += index + ",";
        }
        sql = sql.substring(0, sql.length - 1) + ") VALUES";
        addObjs.forEach(addObj => {
            sql = sql + "(";
            for (var index in addObj) {
                if (typeof addObj[index] == "number") {
                    sql += addObj[index] + ",";
                } else if (typeof addObj[index] == "string") {
                    sql += "N'" + addObj[index] + "'" + ",";
                }
            }
            sql = sql.substring(0, sql.length - 1) + "),";
        });
    }
    sql = sql.substring(0, sql.length - 1) + ";";
    //
    sql += "INSERT INTO " + tableName+ "(";
    for (var index in addObj) {
        sql += index + ",";
    }
    sql = sql.substring(0, sql.length - 1) + ") SELECT ";
    for (var index in addObj) {
        sql += index + ",";
    }
    sql = sql.substring(0, sql.length - 1);
    sql += ` FROM #${tableName}Temp
    WHERE ${uniqueFieldName} NOT IN (
        SELECT ${uniqueFieldName} FROM ${tableName}
    )
    `;

    // logger.info(sql);
    var result = await connection.request().query(sql);
    await mssql.close();// close
    return result;
};

var update = async function (updateObj, whereObj, tableName) {//更新数据
    await mssql.close();// close
    var connection = await getConnection();
    var request = connection.request();

    var sql = "UPDATE " + tableName + " SET ";
    if (updateObj) {
        for (var index in updateObj) {
            if (typeof updateObj[index] == "number") {
                request.input(index, mssql.Int, updateObj[index]);
                sql += index + "=@" + index + ",";
            } else if (typeof updateObj[index] == "string") {
                request.input(index, mssql.NVarChar, updateObj[index]);
                sql += index + "=@" + index + ",";
            }
        }
    }
    sql = sql.substring(0, sql.length - 1) + " WHERE ";
    if (whereObj) {
        for (var index in whereObj) {
            if (typeof whereObj[index] == "number") {
                request.input(index, mssql.Int, whereObj[index]);
                sql += index + "=@" + index + " AND ";
            } else if (typeof whereObj[index] == "string") {
                request.input(index, mssql.NVarChar, whereObj[index]);
                sql += index + "=@" + index + " AND ";
            }
        }
    }
    sql = sql.substring(0, sql.length - 5);
    var result = await request.query(sql);
    await mssql.close();// close
    return result;
};

exports.query = select;
exports.sql = querySql;
exports.update = update;
exports.update = update;
exports.add = add;
exports.addIfNotExist = addIfNotExist;
exports.addList = addList;
exports.addListIfNotExist = addListIfNotExist;