var app = angular.module('myApp', ['nvd3']);

app.constant('DATE_RANGES', {
    "ALL": "all",
    "FIVE_YEARS": "5-years",
    "ONE_YEAR": "1-year",
    "SIX_MONTHS": "6-months",
    "THREE_MONTHS": "3-months",
    "ONE_MONTH": "1-month",
    "ONE_WEEK": "1-week"
});

app.factory('ApiService', function ($http, $q, DATE_RANGES) {

    function ApiService() {

        var self = this;

        var cachedRawData = {};
        var cachedChartData = {};

        self.fetchApiData = function (tickerSymbol) {
            console.debug('fetchApiData', tickerSymbol);

            var deferred = $q.defer();

            var apiUrl = 'https://www.quandl.com/api/v3/datasets/WIKI/{}.json?api_key=iqo1wQDkUJFTyCnb7A1m'.replace(/{}/g, tickerSymbol);
            $http.get(apiUrl).then(
                function (response) {
                    console.debug('fetchApiData', response.data);
                    deferred.resolve(response.data);
                },
                function (response) {
                    // Error handle
                    console.error('fetchApiData', response);
                    switch (response.status) {
                        case 404:
                            // show error message
                            break;
                    }
                    deferred.reject(response);
                });

            return deferred.promise;
        };


        self.getTickerRawData = function (tickerSymbol) {
            console.debug('getTickerRawData', tickerSymbol);

            var deferred = $q.defer();

            // get from cache
            var tickerRawData = cachedRawData[tickerSymbol];
            if (tickerRawData) {
                console.debug('getTickerRawData', tickerRawData, 'CACHED');
                deferred.resolve(tickerRawData);
            }
            // get from api
            else {
                self.fetchApiData(tickerSymbol).then(
                    function (data) {
                        tickerRawData = data;

                        // store to cache
                        if (tickerRawData) {
                            cachedRawData[tickerSymbol] = tickerRawData;
                        }

                        console.debug('getTickerRawData', tickerRawData);
                        deferred.resolve(tickerRawData);
                    },
                    function () {
                        console.error('getTickerRawData', 'FAILED');
                        deferred.reject(null);
                    }
                );

            }

            return deferred.promise;
        };

        self.getMinDateToDisplay = function (dateRange) {
            console.debug('getMinDateToDisplay', dateRange);

            var minDateToDisplay = 0;
            var today = new Date();
            switch (dateRange) {
                case DATE_RANGES.ALL:
                    minDateToDisplay = 0;
                    break;
                case DATE_RANGES.FIVE_YEARS:
                    minDateToDisplay = new Date().setYear(today.getFullYear() - 5);
                    break;
                case DATE_RANGES.ONE_YEAR:
                    minDateToDisplay = new Date().setYear(today.getFullYear() - 1);
                    break;
                case DATE_RANGES.SIX_MONTHS:
                    minDateToDisplay = new Date().setMonth(today.getMonth() - 6);
                    break;
                case DATE_RANGES.THREE_MONTHS:
                    minDateToDisplay = new Date().setMonth(today.getMonth() - 3);
                    break;
                case DATE_RANGES.ONE_MONTH:
                    minDateToDisplay = new Date().setMonth(today.getMonth() - 1);
                    break;
                case DATE_RANGES.ONE_WEEK:
                    minDateToDisplay = new Date().setDate(today.getDate() - 7);
                    break;
                default:
                    minDateToDisplay = 0;
            }
            return minDateToDisplay || 0;
        };

        self.getTickerChartData = function (tickerSymbol, dateRange) {
            console.debug('getTickerChartData', tickerSymbol, dateRange);

            var deferred = $q.defer();

            var cacheKey = tickerSymbol + '_' + dateRange;

            // get from cache
            var tickerChartData = cachedChartData[cacheKey];
            if (tickerChartData) {
                console.debug('getTickerChartData', tickerChartData, 'CACHED');
                deferred.resolve(tickerChartData);
            }
            // get from raw data
            else {
                self.getTickerRawData(tickerSymbol).then(
                    function (tickerRawData) {
                        if (tickerRawData) {

                            // filter by fields
                            tickerChartData = tickerRawData.dataset.data
                                .map(function (arr) {
                                    return [arr[0], arr[4]]; // [Date, ClosePrice]
                                });

                            // filter by minDateToDisplay
                            var minDateToDisplay = self.getMinDateToDisplay(dateRange);
                            if (minDateToDisplay > 0) {
                                tickerChartData = tickerChartData
                                    .filter(function (arr, idx) {
                                        return new Date(arr[0]) >= minDateToDisplay;
                                    });
                            }

                            // store to cache
                            if (tickerChartData) {
                                cachedChartData[cacheKey] = tickerChartData;
                            }
                        }

                        console.debug('getTickerChartData', tickerChartData);
                        deferred.resolve(tickerChartData);
                    },
                    function () {
                        console.error('getTickerChartData', 'FAILED');
                        deferred.reject(null);
                    }
                );

            }

            return deferred.promise;
        };

    }

    return new ApiService();
});

app.controller('MainCtrl', function ($scope, $q, DATE_RANGES, ApiService) {
    $scope.dateRanges = DATE_RANGES;
    $scope.tickerChartData = null;

    $scope.tickerSymbol = 'GOOG';
    $scope.minClosePrice = '400';
    $scope.dateRange = DATE_RANGES.ONE_YEAR;

    $scope.bounceList = [];

    $scope.chartApi = null;
    $scope.chartConfig = {
        visible: true, // default: true
        extended: false, // default: false
        disabled: false, // default: false
        refreshDataOnly: true, // default: true
        deepWatchOptions: true, // default: true
        deepWatchData: true, // default: true
        deepWatchDataDepth: 2, // default: 2
        debounce: 10 // default: 10
    };

    $scope.chartOptions = {
        chart: {
            type: 'stackedAreaChart',
            height: 450,
            margin: {
                top: 20,
                right: 20,
                bottom: 30,
                left: 40
            },
            x: function (d) { return d[0]; },
            y: function (d) { return d[1]; },
            useVoronoi: false,
            clipEdge: true,
            duration: 100,
            useInteractiveGuideline: true,
            xAxis: {
                showMaxMin: false,
                tickFormat: function (d) {
                    return d3.time.format('%x')(new Date(d));
                }
            },
            yAxis: {
                tickFormat: function (d) {
                    return d3.format(',.2f')(d);
                }
            },
            zoom: {
                enabled: true,
                scaleExtent: [1, 10],
                useFixedDomain: false,
                useNiceScale: false,
                horizontalOff: false,
                verticalOff: true,
                unzoomEventType: 'dblclick.zoom'
            },
            dispatch: {
                // stateChange: function (e) { console.log('stateChange'); },
                // changeState: function (e) { console.log('changeState'); },
                // tooltipShow: function (e) { console.log('tooltipShow'); },
                // tooltipHide: function (e) { console.log('tooltipHide'); },
                // renderStart: function (e) { console.log('renderStart'); },
                // renderEnd: function (e) { console.log('renderEnd'); }
            }
        }
    };

    $scope.chartData = [
        {
            "key": "",
            "values": []
        }
    ];

    function resetChart() {
        // clear chart details
        $scope.chartData = [
            {
                "key": "",
                "values": []
            }
        ];
        $scope.chartApi.refresh();
        $scope.chartConfig.disabled = true;

        $scope.tickerChartData = null;
        $scope.bounceList = [];
    }

    $scope.searchTicker = function () {
        var tickerSymbol = $scope.tickerSymbol;
        var dateRange = $scope.dateRange;
        var minClosePrice = parseInt($scope.minClosePrice);

        $scope.loading = true;
        try {
            if (tickerSymbol) {
                ApiService.getTickerChartData(tickerSymbol, dateRange)
                    .then(
                    function (tickerChartData) {
                        // display ticker data
                        if (tickerChartData) {
                            $scope.tickerChartData = tickerChartData;

                            // refresh chart with new data
                            $scope.chartData = [
                                {
                                    "key": tickerSymbol.toUpperCase(),
                                    "values": tickerChartData.map(function (arr) { return [new Date(arr[0]).getTime(), arr[1]]; }).reverse()
                                }
                            ];
                            $scope.chartApi.refresh();
                            $scope.chartConfig.disabled = false;

                            $scope.updateBounceList();
                        }
                        else {
                            resetChart();
                        }
                    },
                    function () {
                        resetChart();
                    })
                    .finally(function () {
                        $scope.loading = false;
                    });
            }
            else {
                throw "400 Bad Request";
            }
        }
        catch (ex) {
            console.error(ex);
            $scope.loading = false;
            resetChart();
        }

    };

    $scope.updateBounceList = function () {
        var tickerChartData = $scope.tickerChartData;
        var minClosePrice = parseInt($scope.minClosePrice);
        if (tickerChartData && minClosePrice > 0) {
            $scope.bounceList = tickerChartData.filter(function (arr) {
                return arr[1] > minClosePrice;
            });
        }
        else {
            $scope.bounceList = [];
        }
    }

    $scope.$watch('dateRange', function (value) {
        $scope.searchTicker();
    });

    $scope.$watch('minClosePrice', function (value) {
        $scope.updateBounceList();
    });

});
