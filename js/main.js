function debug() {
    console.debug('Stock-Exchange', arguments);
}

var app = angular.module('myApp', ['nvd3']);

app.constant('DATE_RANGES', {
    "ALL": "all",
    "FIVE_YEARS": "5-years",
    "ONE_YEAR": "1-year",
    "SIX_MONTHS": "6-months",
    "THREE_MONTHS": "3-months",
    "ONE_MONTH": "1-month",
    "ONE_WEEK": "1-week",
    // "TODAY": "today"
});

app.factory('apiService', function ($http, $q, DATE_RANGES) {

    function apiService() {

        var self = this;

        var cachedRawData = {};
        var cachedChartData = {};

        var fetchApiData = function (tickerSymbol) {
            debug('fetchApiData', tickerSymbol);

            var deferred = $q.defer();

            var apiUrl = 'https://www.quandl.com/api/v3/datasets/WIKI/{}.json?api_key=iqo1wQDkUJFTyCnb7A1m'
                .replace(/{}/g, tickerSymbol);

            $http.get(apiUrl).then(
                function (response) {
                    debug('fetchApiData', response.data, 'SUCCEED');
                    deferred.resolve(response.data);
                },
                function (response) {
                    switch (response.status) {
                        case 404:
                            break;
                    }
                    debug('fetchApiData', response, 'FAILED');
                    deferred.reject(response);
                });

            return deferred.promise;
        };

        var getTickerRawData = function (tickerSymbol) {
            debug('getTickerRawData', tickerSymbol);

            var deferred = $q.defer();

            var tickerRawData = cachedRawData[tickerSymbol];
            if (tickerRawData) {
                debug('getTickerRawData', tickerRawData, 'CACHED');
                deferred.resolve(tickerRawData);
            }
            else {
                fetchApiData(tickerSymbol).then(
                    function (data) {
                        tickerRawData = data;

                        // store to cache
                        if (tickerRawData) {
                            cachedRawData[tickerSymbol] = tickerRawData;
                        }

                        debug('getTickerRawData', tickerRawData, 'SUCCEED');
                        deferred.resolve(tickerRawData);
                    },
                    function (response) {
                        debug('getTickerRawData', response, 'FAILED');
                        deferred.reject(response);
                    }
                );
            }

            return deferred.promise;
        };

        var getMinDateToDisplay = function (dateRange) {
            debug('getMinDateToDisplay', dateRange);

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
                case DATE_RANGES.TODAY:
                    minDateToDisplay = today;
                    break;
                default:
                    minDateToDisplay = 0;
            }

            debug('getMinDateToDisplay', dateRange, minDateToDisplay);
            return minDateToDisplay || 0;
        };

        self.getTickerChartData = function (tickerSymbol, dateRange) {
            tickerSymbol = tickerSymbol.toUpperCase();

            debug('getTickerChartData', tickerSymbol, dateRange);

            var deferred = $q.defer();

            var cacheKey = tickerSymbol + '-' + dateRange;

            var tickerChartData = cachedChartData[cacheKey];
            if (tickerChartData) {
                debug('getTickerChartData', tickerChartData, 'CACHED');
                deferred.resolve(tickerChartData);
            }
            else {
                getTickerRawData(tickerSymbol).then(
                    function (tickerRawData) {
                        if (tickerRawData) {

                            // filter by fields
                            tickerChartData = tickerRawData.dataset.data
                                .map(function (arr) {
                                    return [arr[0], arr[4], new Date(arr[0])]; // [Date, ClosePrice, Date.toTime()]
                                });

                            // filter by minDateToDisplay
                            var minDateToDisplay = getMinDateToDisplay(dateRange);
                            if (minDateToDisplay > 0) {
                                tickerChartData = tickerChartData
                                    .filter(function (arr, idx) {
                                        return arr[2] >= minDateToDisplay;
                                    });
                            }

                            // store to cache
                            if (tickerChartData) {
                                cachedChartData[cacheKey] = tickerChartData;
                            }
                        }

                        debug('getTickerChartData', tickerChartData, 'SUCCEED');
                        deferred.resolve(tickerChartData);
                    },
                    function (response) {
                        debug('getTickerChartData', response, 'FAILED');
                        deferred.reject(response);
                    }
                );
            }

            return deferred.promise;
        };

    }

    return new apiService();
});

app.controller('mainCtrl', function ($scope, $q, DATE_RANGES, apiService) {
    $scope.dateRanges = DATE_RANGES;
    $scope.dateRange = DATE_RANGES.ONE_YEAR;
    // $scope.tickerSymbol = 'GOOG';
    // $scope.minClosePrice = '800';

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
            height: 449,
            margin: {
                top: 30,
                right: 0,
                bottom: 30,
                left: 40
            },
            x: function (d) { return d[2]; },
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
            }
        }
    };

    function reset() {
        // clear chart 
        $scope.chartData = [
            {
                "key": "",
                "values": []
            }
        ];
    }
    reset();

    $scope.searchTicker = function () {
        var dateRange = $scope.dateRange;
        var tickerSymbol = $scope.tickerSymbol;

        if (tickerSymbol && dateRange) {
            reset();
            $scope.loading = true;
            try {
                apiService.getTickerChartData(tickerSymbol, dateRange).then(
                    function (tickerChartData) {
                        if (tickerChartData && tickerChartData.length) {
                            // refresh chart data
                            $scope.chartData = [
                                {
                                    "key": tickerSymbol.toUpperCase(),
                                    "values": tickerChartData.reverse()
                                }
                            ];
                        }
                        else {
                            throw "204 No Content";
                        }
                    },
                    function (response) {
                        throw response;
                    })
                    .finally(function () {
                        $scope.loading = false;
                    });
            }
            catch (ex) {
                debug(ex);
                $scope.loading = false;
            }
        }
        else {
            // throw "400 Bad Request";
        }
    };

    $scope.$watch('dateRange', function (dateRange) {
        $scope.searchTicker();
    });

    $scope.$watch('chartData', function (chartData) {
        if (chartData[0].key) {
            debug('showChart', chartData);
            if ($scope.chartApi) $scope.chartApi.refresh();
            $scope.chartConfig.disabled = false;
        }
        else {
            debug('hideChart');
            if ($scope.chartApi) $scope.chartApi.refresh();
            $scope.chartConfig.disabled = true;
        }
        $scope.refreshBounceList();
    });

    $scope.$watch('minClosePrice', function (minClosePrice) {
        $scope.refreshBounceList();
    });

    $scope.refreshBounceList = function () {
        var tickerChartData = $scope.chartData[0].values.slice().reverse();
        var minClosePrice = parseInt($scope.minClosePrice);
        if (tickerChartData && minClosePrice > 0) {
            $scope.bounceList = tickerChartData.filter(function (arr) {
                return arr[1] > minClosePrice;
            });
        }
        else {
            $scope.bounceList = [];
        }
    };

});

angular.element(function () {
    angular.bootstrap(document, ['myApp']);
});