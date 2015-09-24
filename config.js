exports.config = {
  name : 'tttalk.qav',
  description : 'restful',
  host : '127.0.0.1',
  app_port : 5000,
  version : '0.0.1',

  redis : {
    server : '127.0.0.1',
    port : 6379,
    options : {
      auth_pass : null,
      connect_timeout : 15000,
      max_attempts : 3
    }
  },

  // mysql config
  mysql : {
    ttt : {
      main : {
        host : "rds1af09eywn9ct64ey4i.mysql.rds.aliyuncs.com",
        user : "tttalk",
        port : 3306,
        password : "password0123",
        database : "ttt",
        charset : 'utf8mb4',
        dateStrings : true
      },
      readonly1 : {
        host : "tttreadonly1.mysql.rds.aliyuncs.com",
        user : "tttalk",
        port : 3306,
        password : "password0123",
        database : "ttt",
        charset : 'utf8mb4',
        dateStrings : true
      }
    }
  }
};
