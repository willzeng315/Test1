    var express = require('express');
    var router = express.Router();
    var request = require("request");
    var fs = require("fs");
    var cheerio = require("cheerio");

    var nodemailer = require('nodemailer');
    var phantom = require('phantom');
    var CronJob = require('cron').CronJob;

    router.get('/', function(req, res) {
        res.render('index', {
            title: 'Express'
        });
    });




    function getDateTime() {
        var now = new Date();
        var year = now.getFullYear();
        var month = now.getMonth() + 1;
        var day = now.getDate();
        var hour = now.getHours();
        var minute = now.getMinutes();
        var second = now.getSeconds();
        if (month.toString().length == 1) {
            var month = '0' + month;
        }
        if (day.toString().length == 1) {
            var day = '0' + day;
        }
        if (hour.toString().length == 1) {
            var hour = '0' + hour;
        }
        if (minute.toString().length == 1) {
            var minute = '0' + minute;
        }
        if (second.toString().length == 1) {
            var second = '0' + second;
        }
        var dateTime = year + '/' + month + '/' + day + ' ' + hour + ':' + minute + ':' + second;
        return dateTime;
    }




    function getPeachHtmlBody(queryParam, callback) {

        var depDate = queryParam.depDate;
        var oriCode = queryParam.oriCode;
        var dstCode = queryParam.dstCode;

        phantom.create(function(ph) {
            ph.createPage(function(page) {
                var queryUrl = 'https://book.flypeach.com/default.aspx?ao=B2CZHTW' + '&ori=' + oriCode + '&des=' + dstCode + '&dep=' + String(depDate.year + '-' + depDate.month + '-' + depDate.day) + '&adt=1&chd=0&inf=0&langculture=zh-TW&bLFF=false';

                console.log(queryUrl);

                page.open(queryUrl, function(status) {
                    console.log("opened ? ", status);
                    page.evaluate(function() {
                        var i = 1,
                            l = 0,
                            k = 0;
                        var queryName = '';
                        var flightInfos = [];
                        var htmlStr = '';
                        var mailObj = {};
                        var getAttrAry = ['airline_rcd', 'flight_number', 'origin_rcd', 'destination_rcd', 'departure_date', 'arrival_date', 'planned_departure_time', 'planned_arrival_time', 'adult_fare', 'currency_rcd'];

                        for (;;) {
                            queryName = '#optOutward' + i + '_1';

                            if (document.querySelectorAll(queryName)[0] == undefined) {

                                break;
                            }
                            var flightVal = document.querySelectorAll(queryName)[0].value;
                            var flightValAry = flightVal.split('|');
                            var flightInfo = {};
                            for (l = 0; l < getAttrAry.length; l++) {
                                for (k = 0; k < flightValAry.length; k++) {
                                    if (flightValAry[k].indexOf(getAttrAry[l]) !== -1) {

                                        flightInfo[getAttrAry[l]] = flightValAry[k].substring(getAttrAry[l].length + 1);

                                        break;
                                    }
                                }

                            }

                            flightInfos.push(flightInfo);

                            i++;
                        }

                        String.prototype.insert = function(index, string) {
                            if (index > 0) {
                                return this.substring(0, index) + string + this.substring(index, this.length);
                            } else {
                                return string + this;
                            }
                        }

                        function alignPeachTime(timeStr) {
                            var i = 0;
                            var returnStr = timeStr;
                            //console.log('1111111' + timeStr);
                            for (i = 0; i < 4 - timeStr.length; i++) {
                                returnStr = '0'.concat(returnStr);
                            }
                            returnStr = returnStr.insert(2, ':')
                            return returnStr;
                        }

                        function alignPeachDate(dateStr) {
                            dateStr = dateStr.insert(4, '/');
                            dateStr = dateStr.insert(7, '/');
                            return dateStr;

                        }

                        //htmlStr += '<table style="border:3px #FFAC55 solid;padding:5px;" rules="all" cellpadding="5";><tr><th>航班資訊' + flightInfos[0].departure_date + ' ' + flightInfos[0].origin_rcd + '->' + flightInfos[0].destination_rcd + '</th><th>價格</th></tr>';
                        var returnFlightInfos = [];
                        for (i = 0; i < flightInfos.length; i++) {
                            //htmlStr += '<tr>';
                            //htmlStr += '<td>' + flightInfos[i].airline_rcd + flightInfos[i].flight_number + ' 出發 : ' + flightInfos[i].departure_date + ' ' + flightInfos[i].planned_departure_time + ' 抵達 : ' + flightInfos[i].arrival_date + ' ' + flightInfos[i].planned_arrival_time + '</td><td>' + flightInfos[i].adult_fare + ' ' + flightInfos[i].currency_rcd + '</td>';
                            //htmlStr += '</tr>';
                            //console.log(alignPeachTime('123'));
                            //alignPeachTime('123');

                            returnFlightInfos.push({
                                company: 'Peach',
                                depTime: String(alignPeachDate(flightInfos[i].departure_date) + ' ' + alignPeachTime(flightInfos[i].planned_departure_time)),
                                arlTime: String(alignPeachDate(flightInfos[i].arrival_date) + ' ' + alignPeachTime(flightInfos[i].planned_arrival_time)),
                                flightPrice: String(flightInfos[i].adult_fare),
                                flightNo: String(flightInfos[i].airline_rcd + flightInfos[i].flight_number),
                                currency: String(flightInfos[i].currency_rcd)
                            });

                        }
                        // htmlStr += '</table>';

                        return returnFlightInfos;
                    }, function(result) {
                        ph.exit();
                        callback(result);
                    });
                });


            })
        }, {
            parameters: {
                'ignore-ssl-errors': 'yes'
            }
        });

    }

    function getJetstarInfo(oriCode, dstCode, flightInfo) {
        var flightInfoVal = flightInfo.val;
        var flightInfoObj = {};
        var flightPrice = '';
        var flightNo = '';

        var flightInfo1Str = String(flightInfo.html);

        var index1 = flightInfo1Str.indexOf('data-price="') + 'data-price="'.length
        var i = 0;
        for (i = flightInfo1Str.indexOf('data-price="') + 'data-price="'.length; i < flightInfo1Str.length; i++) {
            if (flightInfo1Str[i] === '.') {
                flightPrice = flightInfo1Str.substring(index1, i);

                break;
            }
        }
        var matchFlighNo = 'FlightDesignator&quot;:&quot;';
        var index2 = flightInfo1Str.indexOf(matchFlighNo) + matchFlighNo.length;

        var i = 0;
        for (i = flightInfo1Str.indexOf(matchFlighNo) + matchFlighNo.length; i < flightInfo1Str.length; i++) {

            if (flightInfo1Str[i] === '&') {
                flightNo = flightInfo1Str.substring(index2, i);

                break;
            }
        }

        var indexOfOri1 = flightInfoVal.indexOf(oriCode) + 1;
        var indexOfDst1 = flightInfoVal.indexOf(dstCode) + 1;
        var depTime;
        var arlTime;


        for (i = indexOfOri1 + oriCode.length; i < flightInfoVal.length; i++) {

            if (flightInfoVal[i] === '~') {

                depTimeStr = flightInfoVal.substring(indexOfOri1 + oriCode.length, i).split(' ')[0].split('/');
                //var depTimeStr = depTime.split('/');
                depTime = depTimeStr[2] + '/' + depTimeStr[0] + '/' + depTimeStr[1] + ' ' + flightInfoVal.substring(indexOfOri1 + oriCode.length, i).split(' ')[1];

                break;
            }
        }

        for (i = indexOfDst1 + dstCode.length; i < flightInfoVal.length; i++) {
            if (flightInfoVal[i] === '~') {

                arlTimeStr = flightInfoVal.substring(indexOfDst1 + dstCode.length, i).split(' ')[0].split('/');
                //var arlTimeStr = arlTime.split('/');
                arlTime = arlTimeStr[2] + '/' + arlTimeStr[0] + '/' + arlTimeStr[1] + ' ' + flightInfoVal.substring(indexOfDst1 + dstCode.length, i).split(' ')[1];

                break;
            }
        }
        flightInfoObj.company = 'JetStar';
        flightInfoObj.depTime = depTime;
        flightInfoObj.arlTime = arlTime;
        flightInfoObj.flightPrice = flightPrice;
        flightInfoObj.flightNo = flightNo;
        flightInfoObj.currency = flightInfo.currency;

        return flightInfoObj;

    }

    function getJetStarHtmlBody(queryParam, callback) {

        var depDate = queryParam.depDate;
        var oriCode = queryParam.oriCode;
        var dstCode = queryParam.dstCode;

        var postBody = 'ControlGroupSearchView%24AvailabilitySearchInputSearchView%24DropDownListCurrency=' +
            '&ControlGroupSearchView%24AvailabilitySearchInputSearchView%24DropDownListFareTypes=I' +
            '&ControlGroupSearchView%24AvailabilitySearchInputSearchView%24DropDownListMarketDay1=' + String(depDate.day) +
            '&ControlGroupSearchView%24AvailabilitySearchInputSearchView%24DropDownListMarketDay2=1' +
            '&ControlGroupSearchView%24AvailabilitySearchInputSearchView%24DropDownListMarketDay3=' +
            '&ControlGroupSearchView%24AvailabilitySearchInputSearchView%24DropDownListMarketMonth1=' + String(depDate.year + '-' + depDate.month) +
            '&ControlGroupSearchView%24AvailabilitySearchInputSearchView%24DropDownListMarketMonth2=1968-1' +
            '&ControlGroupSearchView%24AvailabilitySearchInputSearchView%24DropDownListMarketMonth3=' +
            '&ControlGroupSearchView%24AvailabilitySearchInputSearchView%24DropDownListPassengerType_ADT=1' +
            '&ControlGroupSearchView%24AvailabilitySearchInputSearchView%24DropDownListPassengerType_CHD=0' +
            '&ControlGroupSearchView%24AvailabilitySearchInputSearchView%24DropDownListPassengerType_INFANT=0' +
            '&ControlGroupSearchView%24AvailabilitySearchInputSearchView%24RadioButtonMarketStructure=OneWay' +
            '&ControlGroupSearchView%24AvailabilitySearchInputSearchView%24TextBoxMarketDestination1=' + String(dstCode) +
            '&ControlGroupSearchView%24AvailabilitySearchInputSearchView%24TextBoxMarketDestination2=' +
            '&ControlGroupSearchView%24AvailabilitySearchInputSearchView%24TextBoxMarketDestination3=' +
            '&ControlGroupSearchView%24AvailabilitySearchInputSearchView%24TextBoxMarketOrigin1=' + String(oriCode) +
            '&ControlGroupSearchView%24AvailabilitySearchInputSearchView%24TextBoxMarketOrigin2=' +
            '&ControlGroupSearchView%24AvailabilitySearchInputSearchView%24TextBoxMarketOrigin3=' +
            '&ControlGroupSearchView%24ButtonSubmit=' +
            '&__VIEWSTATE=%2FwEPDwUBMGQYAQUeX19Db250cm9sc1JlcXVpcmVQb3N0QmFja0tleV9fFgEFJ01lbWJlckxvZ2luU2VhcmNoVmlldyRtZW1iZXJfUmVtZW1iZXJtZSDCMtVG%2F1lYc7dy4fVekQjBMvD5' +
            '&culture=zh-HK' +
            '&date_picker=&go-booking=&pageToken=sLkmnwXwAsY%3D&ControlGroupSearchView%24AvailabilitySearchInputSearchView%24fromCS=yes';

        phantom.create(function(ph) {
            ph.createPage(function(page) {
                page.open('http://book.jetstar.com/Search.aspx?culture=zh-HK', 'POST', postBody, function(status) {
                    console.log("opened ? ", status);
                    page.evaluate(function() {
                        var flightInfos = [];
                        var i = 0;

                        var flexibleInfo = String(document.querySelectorAll('.flexible')[0].innerHTML)
                        var i = 0;
                        var currencyIndex = -1;
                        for (i = flexibleInfo.indexOf('DropDownListCurrency=') + 'DropDownListCurrency='.length; i < flexibleInfo.length; i++) {

                            if (flexibleInfo[i] === '"') {
                                currencyIndex = i;
                                break;
                            }
                        }

                        var currency = flexibleInfo.substring(flexibleInfo.indexOf('DropDownListCurrency=') + 'DropDownListCurrency='.length, currencyIndex)

                        for (i = 0; i < 10; i++) {
                            if (document.querySelectorAll(String('#ControlGroupSelectView_AvailabilityInputSelectView_RadioButtonMkt1Fare' + i)).length > 0) {
                                flightInfos.push({
                                    'html': document.querySelectorAll(String('#ControlGroupSelectView_AvailabilityInputSelectView_RadioButtonMkt1Fare' + i))[0].outerHTML,
                                    'val': document.querySelectorAll(String('#ControlGroupSelectView_AvailabilityInputSelectView_RadioButtonMkt1Fare' + i))[0].value,
                                    'currency': currency
                                });
                            }

                        }

                        return flightInfos;
                    }, function(result) {

                        var i = 0
                        var flightInfos = [];
                        if (result.length > 0) {
                            for (i = 0; i < result.length; i++) {
                                console.log(result[i].val);
                                flightInfos.push(getJetstarInfo(oriCode, dstCode, result[i]));
                            }

                        }
                        //console.log(getJetstarInfo(oriCode, dstCode, result[0]));
                        //console.log(getJetstarInfo(oriCode, dstCode, result[1]));
                        //ph.exit();
                        callback(flightInfos);
                    });
                    //page.render('github.png');

                });


            });
        });
    }

    function getTigerAirHtmlBody(queryParam, callback) {

        function tigerAirRawInfoParser(tigerAirRawInfoAry) {
            var depTime = '',
                arlTime = '',
                flightNo = '',
                flightInfo = {};

            function dateParser(time, isPM) {

                if (isPM === 'PM') {
                    console.log(time.split(':'));
                    return String(parseInt(time.split(':')[0]) + 12) + ':' + time.split(':')[1];
                } else {
                    return time;
                }
            }

            function mappingMonth(month) {
                var rst = '';
                if (month === 'Jan') {
                    rst = '01';
                } else if (month === 'Feb') {
                    rst = '02';
                } else if (month === 'Mar') {
                    rst = '03';
                } else if (month === 'Apr') {
                    rst = '04';
                } else if (month === 'May') {
                    rst = '05';
                } else if (month === 'Jun') {
                    rst = '06';
                } else if (month === 'Jul') {
                    rst = '07';
                } else if (month === 'Aug') {
                    rst = '08';
                } else if (month === 'Sep') {
                    rst = '09';
                } else if (month === 'Oct') {
                    rst = '10';
                } else if (month === 'Nov') {
                    rst = '11';
                } else if (month === 'Dec') {
                    rst = '12';
                }
                return rst;
            }

            function addPaddingZero(val) {
                if (val.length === 1) {
                    return '0' + val;
                } else {
                    return val;
                }
            }

            depTime += tigerAirRawInfoAry[7] + '/' + mappingMonth(tigerAirRawInfoAry[5]) + '/' + addPaddingZero(tigerAirRawInfoAry[6].split(',')[0]);
            depTime += ' ' + dateParser(tigerAirRawInfoAry[0], tigerAirRawInfoAry[1]);

            arlTime += tigerAirRawInfoAry[15] + '/' + mappingMonth(tigerAirRawInfoAry[13]) + '/' + addPaddingZero(tigerAirRawInfoAry[14].split(',')[0]);
            arlTime += ' ' + dateParser(tigerAirRawInfoAry[8], tigerAirRawInfoAry[9]);

            flightNo = tigerAirRawInfoAry[17] + ' ' + tigerAirRawInfoAry[18];

            //console.log(depTime);
            //console.log(arlTime);
            //console.log(flightNo);
            flightInfo.depTime = depTime;
            flightInfo.arlTime = arlTime;
            flightInfo.flightNo = flightNo;
            flightInfo.company = 'TigerAir'

            return flightInfo;
        }
        console.log('message');
        var depDate = queryParam.depDate;
        var oriCode = queryParam.oriCode;
        var dstCode = queryParam.dstCode;

        var postBody = 'MarketStructure=OneWay&selOrigin=TPE&selDest=KIX&TripKind=oneWay&Origin=TPE&Destination=KIX' +
            '&DepartureDate=19+Sep+2015&ReturnDate=19+Sep+2015&AdultCount=1&ChildCount=0&InfantCount=0&PromoCode=' +
            '&ControlGroupSearchView%24AvailabilitySearchInputSearchView%24DropDownListMarketDateRange1=1%7C1' +
            '&ControlGroupSearchView%24AvailabilitySearchInputSearchView%24DropDownListMarketDateRange2=1%7C1' +
            '&ControlGroupSearchView%24AvailabilitySearchInputSearchView%24DropDownListMarketDay1=' + String(depDate.day) +
            '&ControlGroupSearchView%24AvailabilitySearchInputSearchView%24DropDownListMarketDay2=' +
            '&ControlGroupSearchView%24AvailabilitySearchInputSearchView%24DropDownListMarketMonth1=' + String(depDate.year + '-' + depDate.month) +
            '&ControlGroupSearchView%24AvailabilitySearchInputSearchView%24DropDownListMarketMonth2=' +
            '&ControlGroupSearchView%24AvailabilitySearchInputSearchView%24DropDownListPassengerType_ADT=1' +
            '&ControlGroupSearchView%24AvailabilitySearchInputSearchView%24DropDownListPassengerType_CHD=0' +
            '&ControlGroupSearchView%24AvailabilitySearchInputSearchView%24DropDownListPassengerType_INFANT=0' +
            '&ControlGroupSearchView%24AvailabilitySearchInputSearchView%24RadioButtonMarketStructure=OneWay' +
            '&ControlGroupSearchView%24AvailabilitySearchInputSearchView%24TextBoxMarketDestination1=' + String(dstCode) +
            '&ControlGroupSearchView%24AvailabilitySearchInputSearchView%24TextBoxMarketDestination2=' +
            '&ControlGroupSearchView%24AvailabilitySearchInputSearchView%24TextBoxMarketOrigin1=' + String(oriCode) +
            '&ControlGroupSearchView%24AvailabilitySearchInputSearchView%24TextBoxMarketOrigin2=' +
            '&ControlGroupSearchView%24ButtonSubmit=Get+Flights' +
            '&ControlGroupSearchView_AvailabilitySearchInputSearchViewdestinationStation1=' + String(dstCode) +
            '&ControlGroupSearchView_AvailabilitySearchInputSearchViewdestinationStation2=' +
            '&ControlGroupSearchView_AvailabilitySearchInputSearchVieworiginStation1=' + String(oriCode) +
            '&ControlGroupSearchView_AvailabilitySearchInputSearchVieworiginStation2=' +
            '&ControlGroupSearchView%24AvailabilitySearchInputSearchView%24HIDDENPROMOCODE=' +
            '&ControlGroupSearchView%24AvailabilitySearchInputSearchView%24HiddenFieldExternalRateId=' +
            '&__EVENTARGUMENT=&__EVENTTARGET=&__VIEWSTATE=%2FwEPDwUBMGRk7p3dDtvn3PMYYJ9u4RznKUiVx98%3D&date_picker=2015-10-19' +
            '&date_picker=&hiddendAdultSelection=1&hiddendChildSelection=0&pageToken=';

        phantom.create(function(ph) {
            ph.createPage(function(page) {
                page.open('https://booking.tigerair.com/Search.aspx?culture=en-GB', 'POST', postBody, function(status) {



                });

                function delayQuery() {
                    page.evaluate(function() {
                        //console.log(document.querySelectorAll('html')[0].outerHTML);
                        //return String(document.querySelectorAll('html')[0].outerHTML);
                        var str = '.light prices'
                        var flghtInfoTable = document.querySelectorAll('.select-flight')[0];
                        var fligthRawInfo = "",
                            fligthPrice = "";
                        var flightInfoAry = [],
                            flightInfo = {};

                        //return String(flghtInfoTable);

                        for (var i = 1, row; row = flghtInfoTable.rows[i]; i++) {
                            flightInfo = {};
                            fligthRawInfo = String(row.cells[0].innerText);
                            fligthPrice = String(row.cells[1].innerText);
                            if (fligthRawInfo.indexOf('Stops') > 0 || fligthRawInfo === '' || fligthPrice === '') {
                                continue;
                            }


                            flightInfoAry.push({
                                'RawInfo': String(fligthRawInfo.replace(/(\r\n|\n|\r)/gm, " ")),
                                'Price': String(fligthPrice.replace(/\,/g, ''))
                            });

                            //console.log(flightInfo);
                            //return flightInfoAry;

                        }
                        return flightInfoAry;
                    }, function(result) {
                        //console.log(result);
                        var tigerAirRawInfoAry = [];
                        var flightInfos = [];

                        for (var i = 0; i < result.length; i++) {
                            console.log(result[i].RawInfo);
                            console.log(result[i].Price);
                            tigerAirRawInfoAry = result[i].RawInfo.split(' ');
                            flightInfo = tigerAirRawInfoParser(tigerAirRawInfoAry);
                            fligthPrice = result[i].Price.replace(/(\r\n|\n|\r)/gm, "");
                            flightInfo.currency = fligthPrice.split(' ')[0];
                            flightInfo.flightPrice = fligthPrice.split(' ')[1].replace(/\,/g, '');

                            flightInfos.push(flightInfo);
                        }
                        console.log(flightInfos);
                        callback(flightInfos);
                    });
                }
                setTimeout(delayQuery, 30000);
            })
        }, {
            parameters: {
                'ignore-ssl-errors': 'yes'
            }
        });
    }

    function sendTicketMail(){
        var queryFunctionList=[];
        var htmlStr = '';
        
        var transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: 'yesazclwill@gmail.com',
                pass: 'yesazclwill315'
            }
        });

        var flightResults = [];
        var queryParam={
                        //company: queryString.company,
                        depDate: {
                            year: '2016',
                            month: '04',
                            day: '02'
                        },
                        oriCode: 'TPE',
                        dstCode: 'KIX'
                    }

        htmlStr += '<table style="border:3px #FFAC55 solid;padding:5px;" rules="all" cellpadding="5";><tr><th>航班資訊' 
        + String(queryParam.depDate.year 
            + '-' + queryParam.depDate.month + '-' 
            + queryParam.depDate.day) + ' ' + queryParam.oriCode 
        + '->' + queryParam.dstCode + '</th><th>價格</th></tr>';            

        queryFunctionList.push(getJetStarHtmlBody);
        queryFunctionList.push(getPeachHtmlBody);

        (function loop(queryParam, i) {
             // console.log(queryParam);
             console.log('********************************************   =====   '+i);
             queryFunctionList[i](queryParam, function(result) {
                flightResults = flightResults.concat(result);
                console.log('********************************************   =====   '+i);
                 console.log(result);
                for (j = 0; j < result.length; j++) {
                    htmlStr += '<tr>';
                    htmlStr += '<td>' + result[j].flightNo + ' 出發 : ' + result[j].depTime + ' 抵達 : ' + result[j].arlTime + '</td><td>' + result[j].flightPrice + ' ' + result[j].currency + '</td>';
                    htmlStr += '</tr>';

                }
                 //htmlBody += result;
                 //console.log(i);
                 if (i < queryFunctionList.length - 1) {
                     loop(queryParam, i + 1);
                 } else {
                    
                    console.log(flightResults);
                    //res.send(flightResults);

                     var mailOptions = {
                         from: 'yesazcl@gmail.com', // sender address
                         to: 'yesazcl@gmail.com', // list of receivers
                         subject: '航班資訊' +queryParam.oriCode + '->' + queryParam.dstCode+ ' (' + getDateTime() + ')', // Subject line
                         html: htmlStr // html body
                     };

                     // send mail with defined transport object
                     transporter.sendMail(mailOptions, function(error, info) {
                         if (error) {
                             return console.log(error);
                         }
                         console.log('Message sent: ' + info.response);

                     });
                 }
             });
         }(queryParam, 0));
    }
    // router.post('/testPost', function(req, res) {
    //     console.log('123123');
    //     console.log(req.query);
    // });

    router.get('/sendTicketMail', function(req, res) {

        console.log('123123123');

        var job = new CronJob({
          cronTime: '0 34 9,14,22 * * *',
          onTick: function() {
            sendTicketMail();
            console.log('123123123');
          }});
        res.send('123123');
        job.start();
    });

    router.post('/getFlightInfos', function(req, res) {

        console.log(req.query);

        var transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: 'yesazclwill@gmail.com',
                pass: 'yesazclwill315'
            }
        });


        var queryParamAry = [];

        queryParamAry.push({
            depDate: {
                year: req.query.depDateYY,
                month: req.query.depDateMM,
                day: req.query.depDateDD
            },
            oriCode: req.query.oriCode,
            dstCode: req.query.dstCode
        });
        var htmlStr = '';
        htmlStr += '<table style="border:3px #FFAC55 solid;padding:5px;" rules="all" cellpadding="5";><tr><th>航班資訊' + String(queryParamAry[0].depDate.year + '-' + queryParamAry[0].depDate.month + '-' + queryParamAry[0].depDate.day) + ' ' + queryParamAry[0].oriCode + '->' + queryParamAry[0].dstCode + '</th><th>價格</th></tr>';

        var flightResults = [];

        var queryFunctionList=[];

        queryFunctionList.push(getJetStarHtmlBody);
        queryFunctionList.push(getPeachHtmlBody);
        //queryFunctionList.push(getTigerAirHtmlBody);
        var j = 0;
        (function loop(queryParam, i) {
             // console.log(queryParam);
             console.log('********************************************   =====   '+i);
             queryFunctionList[i](queryParam, function(result) {
                flightResults = flightResults.concat(result);
                console.log('********************************************   =====   '+i);
                 console.log(result);
                for (j = 0; j < result.length; j++) {
                    htmlStr += '<tr>';
                    htmlStr += '<td>' + result[j].flightNo + ' 出發 : ' + result[j].depTime + ' 抵達 : ' + result[j].arlTime + '</td><td>' + result[j].flightPrice + ' ' + result[j].currency + '</td>';
                    htmlStr += '</tr>';

                }
                 //htmlBody += result;
                 //console.log(i);
                 if (i < queryFunctionList.length - 1) {
                     loop(queryParam, i + 1);
                 } else {
                    
                    console.log(flightResults);
                    res.send(flightResults);

                     /*var mailOptions = {
                         from: 'yesazcl@gmail.com', // sender address
                         to: 'yesazcl@gmail.com', // list of receivers
                         subject: '航班資訊' +queryParamAry[0].oriCode + '->' + queryParamAry[0].dstCode+ ' (' + getDateTime() + ')', // Subject line
                         html: htmlStr // html body
                     };

                     // send mail with defined transport object
                     transporter.sendMail(mailOptions, function(error, info) {
                         if (error) {
                             return console.log(error);
                         }
                         console.log('Message sent: ' + info.response);

                     });*/
                 }
             });
         }(queryParamAry[0], 0));

        // if (req.query.company === 'JetStar') {
        //     console.log('JetStar');
        //     getJetStarHtmlBody(queryParamAry[0], function(result) {
        //         flightResults = flightResults.concat(result);
        //         // for (i = 0; i < result.length; i++) {
        //         //     htmlStr += '<tr>';
        //         //     htmlStr += '<td>' + result[i].flightNo + ' 出發 : ' + result[i].depTime + ' 抵達 : ' + result[i].arlTime + '</td><td>' + result[i].flightPrice + ' ' + result[i].currency + '</td>';
        //         //     htmlStr += '</tr>';

        //         // }
        //         //         var mailOptions = {
        //         //     from: 'yesazcl@gmail.com', // sender address
        //         //     to: 'yesazcl@gmail.com', // list of receivers
        //         //     subject: '航班資訊' +queryParamAry[0].oriCode + '->' + queryParamAry[0].dstCode+ ' (' + getDateTime() + ')', // Subject line
        //         //     html: htmlStr // html body
        //         // };

        //         // // send mail with defined transport object
        //         // transporter.sendMail(mailOptions, function(error, info) {
        //         //     if (error) {
        //         //         return console.log(error);
        //         //     }
        //         //     console.log('Message sent: ' + info.response);
        //         // });
        //         console.log(result);
        //         res.send(flightResults);


        //     });
        // }

        // if (req.query.company === 'Peach') {
        //     console.log('Peach');

        //     getPeachHtmlBody(queryParamAry[0], function(result) {
        //         flightResults = flightResults.concat(result);
        //         console.log(result);
        //         res.send(flightResults);
        //     });
        // }

        // if (req.query.company === 'TigerAir') {
        //     console.log('TigerAir');

        //     getTigerAirHtmlBody(queryParamAry[0], function(result) {
        //         flightResults = flightResults.concat(result);
        //         console.log(result);
        //         res.send(flightResults);
        //     });
        // }

        //return flightResults;
        /*for (i = 0; i < result.length; i++) {
            htmlStr += '<tr>';
            htmlStr += '<td>' + result[i].flightNo + ' 出發 : ' + result[i].depTime + ' 抵達 : ' + result[i].arlTime + '</td><td>' + result[i].flightPrice + ' ' + result[i].currency + '</td>';
            htmlStr += '</tr>';

        }
        htmlStr += '</table>';
        res.render('index', {
            title: 'Express',
            htmlBody : htmlStr
        });*/

        // var mailOptions = {
        //             from: 'yesazcl@gmail.com', // sender address
        //             to: 'yesazcl@gmail.com', // list of receivers
        //             subject: '航班資訊' +queryParamAry[0].oriCode + '->' + queryParamAry[0].dstCode+ ' (' + getDateTime() + ')', // Subject line
        //             html: htmlStr // html body
        //         };

        //         // send mail with defined transport object
        //         transporter.sendMail(mailOptions, function(error, info) {
        //             if (error) {
        //                 return console.log(error);
        //             }
        //             console.log('Message sent: ' + info.response);
        //         });
        //});*/




        /* queryParamAry.push({
             depDate: '2015-12-29',
             oriCode: 'TPE',
             dstCode: 'KIX'
         });
         queryParamAry.push({
             depDate: '2015-11-29',
             oriCode: 'TPE',
             dstCode: 'KIX'
         });
         queryParamAry.push({
             depDate: '2015-10-29',
             oriCode: 'TPE',
             dstCode: 'KIX'
         });
         queryParamAry.push({
             depDate: '2015-09-29',
             oriCode: 'TPE',
             dstCode: 'KIX'
         });
         queryParamAry.push({
             depDate: '2015-08-29',
             oriCode: 'TPE',
             dstCode: 'KIX'
         });

         var htmlBody = '';
         //var i = 0;

         (function loop(queryParam, i) {
             // console.log(queryParam);
             getPeachHtmlBody(queryParam, function(result) {


                 console.log(result);
                 htmlBody += result;
                 //console.log(i);
                 if (i < queryParamAry.length - 1) {
                     loop(queryParamAry[i + 1], i + 1);
                 } else {
                     var mailOptions = {
                         from: 'yesazcl@gmail.com', // sender address
                         to: 'yesazcl@gmail.com,a1215203@gmail.com', // list of receivers
                         subject: 'Peach' + ' (' + getDateTime() + ')', // Subject line
                         html: htmlBody // html body
                     };

                     // send mail with defined transport object
                     transporter.sendMail(mailOptions, function(error, info) {
                         if (error) {
                             return console.log(error);
                         }
                         console.log('Message sent: ' + info.response);

                     });
                 }
             });
         }(queryParamAry[0], 0));*/



        /**/

        /*res.render('index', {
            title: 'mail sent'
        });*/

    });

    module.exports = router;
