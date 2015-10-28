angular.module('cheapFlightApp', ['ui.router'])
    .config([
        '$stateProvider',
        '$urlRouterProvider',
        function($stateProvider, $urlRouterProvider) {

            $stateProvider
                .state('home', {
                    url: '/home',
                    templateUrl: 'templateURLs/flightInfo.html',
                    controller: 'flightCtrl'
                });

            $urlRouterProvider.otherwise('home');
        }
    ])
    .factory('flightData', ['$http', function($http) {
        /*var retObj = {
            data: []
        }*/
        var retObj = {};
        retObj.getFilght = function(queryString, callBack) {
            console.log(queryString.replace('/home', ''));
            $http.get('/getFlightInfos' + queryString.replace('/home', '')).success(function(data) {
                callBack(data);

            });
        };
        return retObj;
    }])
    .controller('flightCtrl', ['$scope', '$http', '$location', 'flightData', function($scope, $http, $location, flightData) {
        var airportList = [{
            "id": "01",
            "code": "TPE",
            "title": "桃園",
            'to': ['KIX', 'NRT']
        }, {
            "id": "06",
            "code": "KHH",
            "title": "高雄",
            'to': ['KIX', 'NRT']
        }, {
            "id": "03",
            "code": "KIX",
            "title": "大阪",
            'to': ['TPE', 'KHH']
        }, {
            "id": "04",
            "code": "NRT",
            "title": "東京",
            'to': ['TPE', 'KHH']
        }];

        // $scope.flightInfos=flightData.data;

        $scope.flightSearch = function() {

            var flightInfos = [];
            $scope.flightInfos = flightInfos;

            console.log($scope.depDate)

            var dateStr=String($scope.depDate).split('-');
            var dateYY=dateStr[0],dateMM=dateStr[1],dateDD=dateStr[2];
            var oriCode=$scope.chooseOriAirport.code,dstCode=$scope.chooseDestAirport.code;

            console.log(dateYY);
            console.log(dateMM);
            console.log(dateDD);

            console.log($scope.chooseOriAirport.code);
            console.log($scope.chooseDestAirport.code);


            var flightInfoTitle = {
                company: '航空公司',
                depTime: '出發',
                arlTime: '抵達',
                flightPrice: '價格',
                flightNo: '航班資訊',
                currency: '貨幣'
            };
            var queryUrl1 = $location.search({
                company: 'JetStar',
                depDateYY: dateYY,
                depDateMM: dateMM,
                depDateDD: dateDD,
                oriCode: oriCode,
                dstCode: dstCode
            }).$$url;

            var queryUrl2 = $location.search({
                company: 'Peach',
                depDateYY: dateYY,
                depDateMM: dateMM,
                depDateDD: dateDD,
                oriCode: oriCode,
                dstCode: dstCode
            }).$$url;

            var queryUrl3 = $location.search({
                company: 'TigerAir',
                depDateYY: dateYY,
                depDateMM: dateMM,
                depDateDD: dateDD,
                oriCode: oriCode,
                dstCode: dstCode
            }).$$url;

            //console.log(queryUrl);                       
            //console.log('messagesssss');
            flightInfos.push(flightInfoTitle);



            //console.log($scope.chooseOriAirport.code);
            //console.log($scope.chooseDestAirport.code);
            //console.log($scope.depDate)

            /*flightInfos.push([ { company: 'JetStar',
    depTime: '12/05/2015 07:00',
    arlTime: '12/05/2015 10:30',
    flightPrice: '5298',
    flightNo: '3K723',
    currency: 'TWD' },
  { company: 'JetStar',
    depTime: '12/05/2015 12:45',
    arlTime: '12/05/2015 16:10',
    flightPrice: '3798',
    flightNo: '3K721',
    currency: 'TWD' } ]);*/
            flightData.getFilght(queryUrl1, function(result) {
                console.log(result);
                var i = 0;
                for (i = 0; i < result.length; i++) {
                    flightInfos.push(result[i]);
                }
                //.concat(result);
            });

            flightData.getFilght(queryUrl2, function(result) {
                console.log(result);
                var i = 0;
                for (i = 0; i < result.length; i++) {
                    flightInfos.push(result[i]);
                }
                //.concat(result);
            });

            flightData.getFilght(queryUrl3, function(result) {
                console.log(result);
                var i = 0;
                for (i = 0; i < result.length; i++) {
                    flightInfos.push(result[i]);
                }
                //.concat(result);
            });

            //$scope.flightInfos=result;
            //flightData.getFilght();
            //flightData.getFilght();
        }

        //flightInfos;
        $scope.selectDepAirport = function() {
            var destOptions = $scope.chooseOriAirport.to;
            var i = 0,
                j = 0;
            var filterDest = [];
            for (i = 0; i < destOptions.length; i++) {
                for (j = 0; j < airportList.length; j++) {
                    if (destOptions[i] === airportList[j].code) {
                        filterDest.push(airportList[j]);
                    }
                }
            }

            $scope.destAirport = filterDest;

        }

        $scope.selectArlAirport = function() {
            //$scope.destAirport = airportList
        }



        $scope.oriAirport = airportList



    }])
    .directive('jqdatepicker', function() {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function(scope, element, attrs, ctrl) {
                $(element).datepicker({
                    dateFormat: 'yy-mm-dd',
                    onSelect: function(depDate) {
                        ctrl.$setViewValue(depDate);
                        ctrl.$render();
                        scope.$apply();
                    }
                });
            }
        };
    });;