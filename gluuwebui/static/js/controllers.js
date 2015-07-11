var webuiControllers = angular.module('webuiControllers', ['ui.bootstrap']);

webuiControllers.service('AlertMsg', ['$rootScope', function( $rootScope ){
    var service = {
        alerts : [],
        addMsg: function( message, type ){
            if( typeof message == 'undefined' || typeof type == 'undefined' ){
                console.error('An alert with insufficient parameters was passed. Requires (message, type)' );
                return false;
            }
            var item = { msg: message, type: type };
            var index = service.alerts.push( item ) - 1;
            $rootScope.$broadcast( 'alerts.update' );
            return index;
        },
        removeMsg: function( index ){
            service.alerts.splice( index, 1 );
            $rootScope.$broadcast( 'alerts.update' );
        },
        clear: function(){
            service.alerts = [];
            $rootScope.$broadcast( 'alerts.update' );
        }
    };

    return service;
}]);

webuiControllers.controller('AlertController', ['$scope', 'AlertMsg',
    function( $scope, AlertMsg ){
        $scope.$on( 'alerts.update', function( ev ){
            $scope.alerts = AlertMsg.alerts;
        });
        $scope.alerts = AlertMsg.alerts;

        $scope.closeAlert = function(index){
            AlertMsg.removeMsg(index);
        };
}]);

function postErrorAlert( Alert, data ){
    try{
        if( typeof data.message == 'string' ){
            Alert.addMsg( data.message, "danger" );
        }
    }catch(e){
        Alert.addMsg( "Could not reach the server. Make sure the WEB UI server is running and connected", 'danger');
    }
}

// Controller to load resources when requested
webuiControllers.controller('OverviewController', ['$scope', '$http', '$routeParams', 'AlertMsg',
    function($scope, $http, $routeParams, AlertMsg){
        // Clear the alerts
        AlertMsg.clear();

        var resource = $routeParams.resource;
        $scope.currentResURI = resource;
        $scope.currentResource = resource.charAt(0).toUpperCase() + resource.slice(1).replace("_", " ");

        // get the overview table and update the headers and rows
        $http.get('/'+resource).success( function( data ){
            if( !data.length ){
                AlertMsg.addMsg( "The are no " + $scope.currentResource +"s available in the Gluu Cluster. Create a new one.", "warning" );
                return;
            }
            $scope.contents = data;
        }).error(function(data){
            postErrorAlert(AlertMsg, data);
        });


        /*
         * Fucntion to delete a resource. This is called whenever a delete button is clicked in the overview UI
         */
        $scope.deleteResource = function(resource, id){
            $http.delete("/"+resource+"/"+id).success(function(data){
                // remove the resource from the view
                var contents = $scope.contents;
                for(var i=0; i < contents.length; i++){
                    if( contents[i].id == id ){
                        contents.splice(i,1);
                        $scope.contents = contents;
                        // check and remove the details view also
                        if( $scope.details.id == id ){
                            $scope.details = undefined;
                        }
                        break;
                    }
                }
                AlertMsg.addMsg("The "+resource+" with the ID: "+id+" was successfully deleted.", "success");
                return;
            }).error(function(data){
                postErrorAlert(AlertMsg, data);
            });
        };

        /*
         * Function that loads the reource's native response from the API server and presents in the view
         */
        $scope.loadResource = function(resource, id){
            $http.get('/'+resource+"/"+id).success(function(data){
                $scope.details = data;
                $scope.detailKeys = Object.keys(data);
            }).error(function(data){
                postErrorAlert(AlertMsg, data);
            });
        };

}]);


// controller that is used to respond to add/edit actions on resources
webuiControllers.controller( 'ResourceController', ['$scope', '$http', '$routeParams', 'AlertMsg', '$location',
    function($scope, $http, $routeParams, AlertMsg, $location){
        // Clear all alert messages
        AlertMsg.clear();

        $scope.editMode = false;
        $scope.resourceData = {};

        /*
         *  Upon initializing the form check whether it is in edit mode or create mode and add data accordingly
         */
        var resource = $routeParams.resource;
        if ($routeParams.action == 'edit'){
            if ( typeof $routeParams.id == 'undefined' ){
                AlertMsg.addMsg( "The resource id is empty! Make sure you selected a resource before clicking Edit", "danger" );
                return;
            }
            $scope.editMode = true;
            var id = $routeParams.id;
            $http.get( "/" + resource + "/" + id).success( function(data){
                $scope.resourceData = data;
            }).error(function(data){
                postErrorAlert(AlertMsg, data);
            });
        }

        /*
         *  If the resource is a node add the list of ids for cluster and provider as a dropdown
         */
        if( resource == 'nodes' ){
            $scope.clusters = [];
            $scope.providers = [];

            $http.get("/clusters").success(function(data){
                for (var i=0; i < data.contents.length; i++ ){
                    $scope.clusters.push({'id' : data.contents[i]['ID'], 'name': data.contents[i]['Name']});
                }
            }).error(function(data){
                postErrorAlert(AlertMsg, data);
            });

            $http.get("/providers").success(function(data){
                for( var i=0; i < data.contents.length; i++ ){
                    $scope.providers.push({'id' : data.contents[i]['ID'], 'name': data.contents[i]['Host Name']});
                }
            }).error(function(data){
                postErrorAlert(AlertMsg, data);
            });
        }

        /*
         *  Funtion that handles the New Resource and Edit Resource form submissions
         *  This fucntion is called whent the 'Add Resource' button is clicked in the form
         *
         */
        $scope.submit = function(){
            var data = $scope.resourceData;

            if( $scope.editMode ){
                $http.post("/" + resource + "/" + data.id, data).success(function(data, status){
                    // redirect to the overview page with a message that things have been updated
                    $location.path('/view/'+resource);
                }).error(function(data){
                    postErrorAlert(AlertMsg, data);
                });
            } else {  // Not in Edit Mode == New Resource
                $http.post("/" + resource, data).success(function( data, status){
                    // redirect to the overview page with a message that new cluster was created
                    $location.path('/view/'+resource);
                }).error(function( data ){
                    postErrorAlert(AlertMsg, data);
                });
            }
        };
}]);
