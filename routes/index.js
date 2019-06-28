var express = require('express');
var router = express.Router();
var fs = require('fs');
var template = require('../lib/template');
var db = require('../lib/db');

router.get('/', function (request, response) {
    var login_form = ``;
    login_form = template.loginForm(request.session.is_logined, request.session.name);

    template.Main(1, request, response, db, login_form);

    // db.query(`SELECT * FROM busking_info`, function (error, busking_info) {
    //     var queryString = 'select * from products order by id desc limit ?,?';
    //     db.query(queryString, [no, page_size], function (error, result) {
    //         response.render('main', {
    //             login_form: `${login_form}`,
    //             busking_info: busking_info ? busking_info : {},
    //             data: result,
    //             pasing: result2
    //         });
    //     })
    // })
    // var paging = template.Paging(1, db);
    // console.log(paging);

    // var queryString = 'SELECT * FROM busking_info ORDER BY board_num ASC limit ?,?';
    // db.query(queryString, [no, page_size], function (error, busking_info) {
    //     response.render('main', {
    //         login_form: `${login_form}`,
    //         busking_info: busking_info ? busking_info : {},
    //         pasing: result2,
    //         detail_board_num: `${request.params.board_num}`
    //     });
    // })
});

router.get('/pasing/:cur', function (request, response) {
    var login_form = ``;
    login_form = template.loginForm(request.session.is_logined, request.session.name);

    template.Main(request.params.cur, request, response, db, login_form);
})

router.get('/signUp', function (request, response) {
    response.render('signUp.html')
})

router.post('/signUp_process', function (request, response) {
    var post = request.body;

    db.query('INSERT INTO signUp VALUES (?, ?, ?, ?, ?, ?)',
        [post.id, post.password, post.name, post.birthday, post.sex, post.email], function (error, result) {
            if (error) {
                throw (error);
            } else {
                response.redirect('/');
            }
        });
});
router.get('/search', (request, response)=>{
    console.log(request.query);

    response.redirect(`/search/${request.query.searchId}`);
})
router.get('/search/:searchId', (request, response)=>{
    var key = request.params.searchId;
    var list = [];
    db.query(`SELECT board_num FROM busking_info WHERE singer LIKE '%${key}%' OR song LIKE '%${key}%'`, (err, value)=>{
        for(var i = 0; i < value.length; i++)
            list.push(value[i].board_num);
        list.sort((a, b)=>{ // 오름차순 정렬, 혹시나 있을지 모르는 중복의 제거를 위해
            return a - b;
        });

        var view = 'searchView';
        var state = '';
        for(var i = 0; i < list.length; i++){
            if(i!=0 && list[i] === list[i-1])
                continue;
            if(i == 0)
                state += list[i];
            else
                state += (' OR '+ list[i]);
        }

        db.query(`DROP VIEW IF EXISTS ${view}`, (err2, tmp)=>{ // 검색할때마다 뷰 초기화
            db.query(`CREATE VIEW ${view} AS SELECT * FROM busking_info WHERE board_num=${state}`, (err3, tmp2)=>{ // create view for search
                var login_form = ``;
                login_form = template.loginForm(request.session.is_logined, request.session.name);

                template.Main(1, request, response, db, login_form, view);
            });
        });
    });
});
router.post('/login_process', function (request, response) {
    var post = request.body;

    db.query(`SELECT * FROM signUp`, function (error, login) {
        var count = 0;

        while (count < login.length) {
            if (login[count].id === post.id && login[count].password === post.password) {
                request.session.is_logined = true;
                request.session.name = login[count].name;
                break;
            }
            count++;
        }
        request.session.save(function () {
            response.redirect('/');
        })
    });
})

router.get('/logout', function (request, response) {
    request.session.destroy(function (err) {
        response.redirect('/');
    });
});

router.get('/my_info', function (request, response) {

    db.query(`SELECT * FROM signUp WHERE name=?`, [request.session.name], function (err, info) {
        response.render('my_info', {
            id: `${info[0].id}`,
            password: `${info[0].password}`,
            name: `${info[0].name}`,
            date: `${info[0].date}`,
            sex: `${info[0].sex}`,
            email: `${info[0].email}`
        });
    });
});

router.get('/write_live_create', function (request, response) {
    if (!request.session.is_logined) {
        console.log("err 발생!");
        response.redirect('/');
    }
    else{ //else를 붙여주니 main page 그대로!
    response.render('write_live_create.html'); //
  }
});

//image upload 모듈및 방법들
var multer = require('multer'); // multer모듈 적용 (for 파일업로드)
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/images') // cb 콜백함수를 통해 전송된 파일 저장 디렉토리 설정
    },
      filename: function (req, file, cb) {
        cb(null, file.originalname) // cb 콜백함수를 통해 전송된 파일 이름 설정
    }
})
var upload = multer({ storage: storage })

router.post('/write_live_create_process', upload.single('image'), function (request, response) {
    var post = request.body;
    var imageFile = request.file;
    var board_num = 1;

    console.log(imageFile);
    db.query(`SELECT * FROM busking_info ORDER BY board_num DESC`, function (error, info) {

        if (info[0] !== undefined) {
            board_num = info[0].board_num + 1;
        }

        db.query(`INSERT INTO busking_info VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [request.session.name, board_num, imageFile.filename, post.singer, post.main_song, post.song_list, post.genre, post.start, post.end,
            post.location, post.location_detail, post.youtube_link, 0], function (error, info) {
                if (error) {
                    throw (error);
                } else {
                    response.redirect('/');
                }
            }
        )
    })
})

//img src="" => 경로설정
router.get('/images/:image_name', function (request, response) {
    fs.readFile(`/images/${request.params.image_name}`, function (error, data) {
        response.send(data);
    })
});

router.get('/show_detail/:board_num', function (request, response) {
    db.query(`UPDATE busking_info SET click_count = click_count+1 WHERE board_num = ?`,[ request.params.board_num], (err, result)=>{
        if(err)
            throw err;
    });
    var login_form = ``;
    login_form = template.loginForm(request.session.is_logined, request.session.name);
    // console.log(Math.ceil(request.params.board_num / 10));
    var cur = Math.ceil(request.params.board_num / 2);
    template.Main(cur, request, response, db, login_form);
    // db.query(`SELECT * FROM busking_info`, function (error, busking_info) {
    //     response.render('main', {
    //         login_form: `${login_form}`,
    //         busking_info: busking_info ? busking_info : {},
    //         detail_board_num: `${request.params.board_num}`
    //     });
    // })
})

router.get('/youtube/:board_num', function (request, response) {
    var login_form = ``;
    login_form = template.loginForm(request.session.is_logined, request.session.name);

    // db.query(`SELECT * FROM busking_info WHERE board_num=?`, [request.params.board_num], function (error1, info) {
    //     console.log(info);
    //     var click_count = info[0].click_count + 1;
    //     console.log(click_count);
    //     db.query(`UPDATE busking_info SET click_count=? WHERE board_num=?`, [click_count, request.params.board_num], function (error2, result) {
    //     })
    // })
    // 수정했음
    db.query(`UPDATE busking_info SET click_count=click_count+1 WHERE board_num=?`, [request.params.board_num], (error2, result) => {
    })

    var cur = Math.ceil(request.params.board_num / 2);
    template.Main(cur, request, response, db, login_form);
})

router.get('/my_write_live', function (request, response) {
    var login_form = ``;
    login_form = template.loginForm(request.session.is_logined, request.session.name);

    var page_size = 2;
    //페이지의 갯수 : 1 ~ 10개 페이지
    var page_list_size = 2;
    //limit 변수
    var no = "";
    //전체 게시물의 숫자
    var totalPageCount = 0;

    var queryString = 'select count(*) as cnt from busking_info'
    db.query(queryString, function (error2, data) {
        if (error2) {
            console.log(error2 + "메인 화면 mysql 조회 실패");
            return
        }
        //전체 게시물의 숫자
        totalPageCount = data[0].cnt

        //현제 페이지
        var curPage = 1;

        console.log("현재 페이지 : " + curPage, "전체 페이지 : " + totalPageCount);


        //전체 페이지 갯수
        if (totalPageCount < 0) {
            totalPageCount = 0
        }

        var totalPage = Math.ceil(totalPageCount / page_size);// 전체 페이지수
        var totalSet = Math.ceil(totalPage / page_list_size); //전체 세트수
        var curSet = Math.ceil(curPage / page_list_size) // 현재 셋트 번호
        var startPage = ((curSet - 1) * 2) + 1 //현재 세트내 출력될 시작 페이지, 5=> page size
        var endPage = (startPage + page_list_size) - 1; //현재 세트내 출력될 마지막 페이지


        //현재페이지가 0 보다 작으면
        if (curPage < 0) {
            no = 0
        } else {
            //0보다 크면 limit 함수에 들어갈 첫번째 인자 값 구하기
            no = (curPage - 1) * 2 //5 => page size
        }

        console.log('[0] curPage : ' + curPage + ' | [1] page_list_size : ' + page_list_size + ' | [2] page_size : ' + page_size + ' | [3] totalPage : ' + totalPage + ' | [4] totalSet : ' + totalSet + ' | [5] curSet : ' + curSet + ' | [6] startPage : ' + startPage + ' | [7] endPage : ' + endPage)

        var result2 = {
            "curPage": curPage,
            "page_list_size": page_list_size,
            "page_size": page_size,
            "totalPage": totalPage,
            "totalSet": totalSet,
            "curSet": curSet,
            "startPage": startPage,
            "endPage": endPage
        };
        db.query(`SELECT youtube_link FROM Youtube_list ORDER BY click_count DESC limit 0, 5`, function (error, youtube_list) {
            db.query(`SELECT youtube_link FROM busking_info ORDER BY click_count DESC limit 0, 5`, function (error, live_video) {
                db.query(`SELECT * FROM busking_info WHERE user_name=? ORDER BY board_num ASC limit ?,?`, [request.session.name, no, page_size],
                    function (error, busking_info) {
                        response.render('main', {
                            login_form: `${login_form}`,
                            busking_info: busking_info ? busking_info : {},
                            pasing: result2,
                            my_board_view: true,
                            live_video: live_video,
                            youtube_list: youtube_list
                        });
                    }
                )
            })
        })
    })
})

router.get('/update_board/:board_num', function (request, response) {
    db.query(`SELECT * FROM busking_info WHERE board_num=?`, [request.params.board_num], function (error, busking_info) {
        response.render('write_live_update.html', {
            image: busking_info[0].image,
            singer: busking_info[0].singer,
            song: busking_info[0].song,
            song_list: busking_info[0].song_list,
            genre: busking_info[0].genre,
            start_time: busking_info[0].date_start,
            end_time: busking_info[0].date_end,
            location: busking_info[0].location,
            location_detail: busking_info[0].location_detail,
            youtube_link: busking_info[0].youtube_link,
            busking_info: busking_info ? busking_info : {}
        })
    })
})

router.post('/write_live_update_process', upload.single('image'), function (request, response) {
    var post = request.body;
    var imageFile = request.file;
    console.log(post.singer);
    console.log(imageFile);
    db.query(`UPDATE busking_info SET image=?, singer=?, song=?, song_list=?, genre=?, date_start=?,
        date_end=?, location=?, location_detail=?, youtube_link=? WHERE board_num=?`
        , [imageFile.filename, post.singer, post.song, post.song_list, post.genre, post.start,
        post.end, post.location, post.location_detail, post.youtube_link, post.board_num],
        function (error, result) {
            if (error)
                throw (error);
        }
    );
    request.session.save(function () {
        response.redirect('/');
    })
})

router.get('/delete_board_process/:board_num', function (request, response) {
    db.query(`DELETE FROM busking_info WHERE board_num=?`, [request.params.board_num], function (error, result) {
        response.redirect('/');
    })
})

router.post('/find_live_process', function (request, response) {
    var post = request.body;
    console.log(post.location);
    console.log(post.genre);
    var login_form = ``;
    login_form = template.loginForm(request.session.is_logined, request.session.name);

    var page_size = 2;
    //페이지의 갯수 : 1 ~ 10개 페이지
    var page_list_size = 2;
    //limit 변수
    var no = "";
    //전체 게시물의 숫자
    var totalPageCount = 0;

    var queryString = 'select count(*) as cnt from busking_info'
    db.query(queryString, function (error2, data) {
        if (error2) {
            console.log(error2 + "메인 화면 mysql 조회 실패");
            return
        }
        //전체 게시물의 숫자
        totalPageCount = data[0].cnt

        //현제 페이지
        var curPage = 1;

        console.log("현재 페이지 : " + curPage, "전체 페이지 : " + totalPageCount);


        //전체 페이지 갯수
        if (totalPageCount < 0) {
            totalPageCount = 0
        }

        var totalPage = Math.ceil(totalPageCount / page_size);// 전체 페이지수
        var totalSet = Math.ceil(totalPage / page_list_size); //전체 세트수
        var curSet = Math.ceil(curPage / page_list_size) // 현재 셋트 번호
        var startPage = ((curSet - 1) * 2) + 1 //현재 세트내 출력될 시작 페이지, 5=> page size
        var endPage = (startPage + page_list_size) - 1; //현재 세트내 출력될 마지막 페이지


        //현재페이지가 0 보다 작으면
        if (curPage < 0) {
            no = 0
        } else {
            //0보다 크면 limit 함수에 들어갈 첫번째 인자 값 구하기
            no = (curPage - 1) * 2 //5 => page size
        }

        console.log('[0] curPage : ' + curPage + ' | [1] page_list_size : ' + page_list_size + ' | [2] page_size : ' + page_size + ' | [3] totalPage : ' + totalPage + ' | [4] totalSet : ' + totalSet + ' | [5] curSet : ' + curSet + ' | [6] startPage : ' + startPage + ' | [7] endPage : ' + endPage)

        var result2 = {
            "curPage": curPage,
            "page_list_size": page_list_size,
            "page_size": page_size,
            "totalPage": totalPage,
            "totalSet": totalSet,
            "curSet": curSet,
            "startPage": startPage,
            "endPage": endPage
        };
        db.query(`SELECT youtube_link FROM Youtube_list ORDER BY click_count DESC limit 0, 5`, function (error, youtube_list) {
            db.query(`SELECT youtube_link FROM busking_info ORDER BY click_count DESC limit 0, 5`, function (error, live_video) {
                if (post.location === '장소' && post.genre === '장르') {
                    response.redirect('/');
                } else if (post.location === '장소' && post.genre !== '장르') {
                    var login_form = ``;
                    login_form = template.loginForm(request.session.is_logined, request.session.name);

                    db.query('SELECT * FROM busking_info WHERE genre=? ORDER BY board_num ASC limit ?,?', [post.genre, no, page_size], function (error, busking_info) {
                        response.render('main', {
                            login_form: `${login_form}`,
                            busking_info: busking_info ? busking_info : {},
                            pasing: result2,
                            live_video: live_video,
                            youtube_list : youtube_list
                        });
                    })
                } else if (post.location !== '장소' && post.genre === '장르') {
                    var login_form = ``;
                    login_form = template.loginForm(request.session.is_logined, request.session.name);

                    db.query('SELECT * FROM busking_info WHERE location=? ORDER BY board_num ASC limit ?,?', [post.location, no, page_size], function (error, busking_info) {
                        response.render('main', {
                            login_form: `${login_form}`,
                            busking_info: busking_info ? busking_info : {},
                            pasing: result2,
                            live_video: live_video,
                            youtube_list : youtube_list
                        });
                    })
                } else if (post.location !== '장소' && post.genre !== '장르') {
                    var login_form = ``;
                    login_form = template.loginForm(request.session.is_logined, request.session.name);

                    db.query('SELECT * FROM busking_info WHERE location=? AND genre=? ORDER BY board_num ASC limit ?,?', [post.location, post.genre, no, page_size], function (error, busking_info) {
                        response.render('main', {
                            login_form: `${login_form}`,
                            busking_info: busking_info ? busking_info : {},
                            pasing: result2,
                            live_video: live_video,
                            youtube_list : youtube_list
                        });
                    })
                }
            })
        });
    })
    // if (post.location === '장소' && post.genre === '장르') {
    //     response.redirect('/');
    // } else if (post.location === '장소' && post.genre !== '장르') {
    //     var login_form = ``;
    //     login_form = template.loginForm(request.session.is_logined, request.session.name);

    //     db.query('SELECT * FROM busking_info WHERE genre=?', [post.genre], function (error, busking_info) {
    //         response.render('main', {
    //             login_form: `${login_form}`,
    //             busking_info: busking_info ? busking_info : {}
    //         });
    //     })
    // } else if (post.location !== '장소' && post.genre === '장르') {
    //     var login_form = ``;
    //     login_form = template.loginForm(request.session.is_logined, request.session.name);

    //     db.query('SELECT * FROM busking_info WHERE location=?', [post.location], function (error, busking_info) {
    //         response.render('main', {
    //             login_form: `${login_form}`,
    //             busking_info: busking_info ? busking_info : {}
    //         });
    //     })
    // } else if (post.location !== '장소' && post.genre !== '장르') {
    //     var login_form = ``;
    //     login_form = template.loginForm(request.session.is_logined, request.session.name);

    //     db.query('SELECT * FROM busking_info WHERE location=? AND genre=?', [post.location, post.genre], function (error, busking_info) {
    //         response.render('main', {
    //             login_form: `${login_form}`,
    //             busking_info: busking_info ? busking_info : {}
    //         });
    //     })
    // }
});

router.get('/_forgetId', (req,res)=>{
  res.render('forgetId.ejs');
})
router.get('/_forgetpasswd', (req,res)=>{
  res.render('forgetPasswd.ejs')
})
router.post('/forgetId_process', (req,res)=>{
  var info_email = req.body.email; var info_name=req.body.name;
  db.query('SELECT * FROM signUp', (err,data)=>{
      if(info_email == data[0].email){
        if(info_name == data[0].name){
          res.render('return_idInfo', {dataId : data[0].id})
        }
      }
  })
})
router.post('/forgetPasswd_process', (req,res)=>{
  var info_email = req.body.email; var info_name=req.body.name;
  var info_id = req.body.id;
  db.query('SELECT * FROM signUp', (err,data)=>{
      if(info_email == data[0].email){
          if(info_name == data[0].name){
            if(info_id == data[0].id){
              res.render('return_pwInfo');
            }
        }
      }
    })
})
router.post('/new_passwd', (req,res)=>{
  var newpw = req.body.new, newpwCheck = req.body._new;
  db.query('SELECT * FROM signUp', (err,data)=>{
    if(newpw == newpwCheck){
      db.query('UPDATE signUp set password=? WHERE id=? ', [newpw, data[0].id],(err,dataP)=>{
        res.redirect('/');
      })
    }
  })
})
module.exports = router;
