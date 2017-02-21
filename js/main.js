var app = angular.module('myApp', ['nvd3']);

app.controller('MainCtrl', function ($scope, $http) {
    $scope.tickerSymbol = 'GOOG';
    $scope.minClosePrice = '';
    $scope.rawData = null;
    $scope.data = null;


    $scope.chartApi;
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
            }
        }
    };

    $scope.chartData = [
        {
            "key": "",
            "values": []
        }
    ];


    $scope.getData = function () {
         $scope.loading = true;
        var apiUrl = 'https://www.quandl.com/api/v3/datasets/WIKI/{}.json?api_key=iqo1wQDkUJFTyCnb7A1m'.replace(/{}/g, $scope.tickerSymbol);
        $http.get(apiUrl)
            .then(
            function (response) {
                $scope.rawData = response.data;
                // console.log($scope.rawData.dataset.data);
                var today = new Date();
                var todatLastYear = new Date().setYear(today.getFullYear() - 1);
                $scope.data = $scope.rawData.dataset.data
                    .map(function (arr) {
                        return [arr[0], arr[4]]; // [Date, Close]
                    })
                    .filter(function (arr, idx) {
                        return new Date(arr[0]) >= todatLastYear;
                    });

                // $scope.chartData.values = $scope.data.map(function(arr){
                //     return [new Date(arr[0]).getTime(), arr[1]];
                // }).reverse();
                // $scope.chartData.key = $scope.rawData.dataset.dataset_code;
                // $scope.data = $scope.chartData.values;

                $scope.chartData = [
                    {
                        "key": $scope.rawData.dataset.dataset_code,
                        "values": $scope.data.map(function (arr) { return [new Date(arr[0]).getTime(), arr[1]]; }).reverse()
                    }
                ];
                $scope.chartApi.refresh();
                $scope.chartConfig.disabled = false;
                // $scope.chartConfig.visible = true;
            },
            function (response) {
                // Error handle
                console.log(response);
                $scope.chartData = [
                    {
                        "key": "",
                        "values": []
                    }
                ];
                $scope.chartApi.refresh();
                $scope.chartConfig.disabled = true;
                switch (response.status) {
                    case 404:
                        // $scope.chartConfig.visible = false;
                        break;
                }
            })
            .finally(function(){
                 $scope.loading = false;
            });
    };

});
