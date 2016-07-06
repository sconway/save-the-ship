'use strict';
    
Physijs.scripts.worker = '../js/physijs_worker.js';
Physijs.scripts.ammo = '../js/ammo.js';

var initScene, render, tweets = [], objects = [], spawnBox, loader, raycaster,
    renderer, render_stats, physics_stats, scene, ground_material, ground, 
    ground_geometry, ground_material, ground, upGround, light, camera, water, 
    mirrorMesh, light, controls, NoiseGen, spacesphere, INTERSECTED, loader, 
    boat, mesh, $rows, feedInterval,
    numCubes = 0,
    done = false,
    feedMutex = false,
    paused = false,
    curMouse = new THREE.Vector2(), 
    mouse = new THREE.Vector2();


var parameters = {
    width: 2000,
    height: 2000,
    widthSegments: 250,
    heightSegments: 250,
    depth: 1500,
    param: 4,
    filterparam: 1
};

var waterNormals;


initScene = function() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setClearColor( 0xf8f8f8, 1 );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.shadowMap.enabled = true;
    renderer.shadowMapSoft = true;
    document.getElementById( 'viewport' ).appendChild( renderer.domElement );

    // Creates a physijs scene with gravity and sets it to update
    scene = new Physijs.Scene;
    scene.setGravity(new THREE.Vector3( 0, -70, 0 ));

    // initialize the raycaster, which will track hovered objects
    raycaster = new THREE.Raycaster();
    
    
    addCamera();
    addLight();
    addSphereContainer();
    addBase();
    addWater();
    

    controls = new THREE.OrbitControls( camera, renderer.domElement );
    controls.enablePan = false;
    controls.minDistance = 1000.0;
    controls.maxDistance = 5000.0;
    controls.maxPolarAngle = Math.PI * 0.495;

    
    var socket = io.connect();

    socket.on('tweet', function (data) {
      console.log("received tweet");
      tweets.push(data);
    });
    
    document.addEventListener( 'mousemove', onDocumentMouseMove, false );
    window.addEventListener( 'resize', onWindowResize, false );
    requestAnimationFrame( render );
    scene.simulate();
    initFeed();
    realTimeSearch();
};


/**
 * re-renders the scene and its content when the window is resized.
 */ 
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
    controls.handleResize();
}


/**
 * Called every time the mouse moves, it updates the current position
 * of the cursor.
 */
function onDocumentMouseMove( event ) {
    event.preventDefault();
    curMouse.x = event.clientX;
    curMouse.y = event.clientY;
    mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
}


/**
 * This function runs every second and grabs the current piece of data
 * from the array. It uses that data to create a box on the scene. 
 */
function initFeed() {

    feedInterval = setInterval(function() {
        if ( tweets[numCubes] && !paused && !feedMutex && !done ) {
            createBox(tweets[numCubes]);
            prependText(tweets[numCubes]);
            $rows = $("#tweets li");
            numCubes++;
        }
    }, 1000);

}


/**
 * Prepends the tweet text to the tweets container each time
 * it is called. 
 */
function prependText(tweet) {
    // console.log("appending tweet");
    var $li = "<li>" + tweet.body + "</li>";

    $("#tweets").prepend( $li );
}


/**
 * Filters the tweets in the tweet box when there is something typed
 * in the input field. The addition of cubes and the animation is 
 * set to be stopped when there is a filter term present.
 */
function realTimeSearch() {

    $('#tweetSearch').keyup(function() {
        var val = $.trim($(this).val()).replace(/ +/g, ' ').toLowerCase();

        // If there's no value in the tweet search field, resume
        // the feed as it was before. Otherwise, set the mutex
        // so the feed will not continue while we are filtering.
        if ( val.length < 1 ) {
            feedMutex = false;
        } else {
            feedMutex = true;

            $rows.show().filter(function() {
                var text = $(this).text().replace(/\s+/g, ' ').toLowerCase();
                return !~text.indexOf( val );
            }).hide();
        }
    });

}


/**
 * Add the ThreeJS camera to the scene at the specified position.
 */
function addCamera() {
    camera = new THREE.PerspectiveCamera(
        35,
        window.innerWidth / window.innerHeight,
        1,
        100000
    );
    camera.position.set( -434, 213, 875 );
    camera.lookAt( scene.position );
    scene.add( camera );
}


/**
 * Add the ThreeJS lighting to the scene at the specified position.
 * Controls the light and shadow effects and allows the mirroring to work.
 */
function addLight() {
    scene.add( new THREE.AmbientLight( 0x444444 ) );
    light = new THREE.DirectionalLight( 0xffffbb, 1 );
    light.position.set( 0, 500, 0 );
    scene.add( light );
}



/**
 * Adds the container for the display and maps an image around it,
 * creating a boundary for the scene.
 */
function addSphereContainer() {
    // var spacetex = THREE.ImageUtils.loadTexture('../images/earth-moon.jpg');
    // spacetex.wrapS = spacetex.wrapT = THREE.RepeatWrapping;
    // var spacesphereGeo = new THREE.SphereGeometry(3000,64,64);
    // var spacesphereMat = new THREE.MeshBasicMaterial({ 
    //     map: spacetex,
    //     side: THREE.DoubleSide
    // });

    // spacesphere = new THREE.Mesh(spacesphereGeo,spacesphereMat);
    // spacesphere.position.z = -1000
    // spacesphere.rotation.x = 0.25;
    // spacesphere.rotation.y = 7;
    // spacesphere.rotation.z = 0.75;

    // spacesphere.name = "space";
    // scene.add(spacesphere);


    var textureLoader = new THREE.TextureLoader();
    var materials = [
        new THREE.MeshBasicMaterial( { map: textureLoader.load( 'images/px.jpg' ) } ), // right
        new THREE.MeshBasicMaterial( { map: textureLoader.load( 'images/nx.jpg' ) } ), // left
        new THREE.MeshBasicMaterial( { map: textureLoader.load( 'images/py.jpg' ) } ), // top
        new THREE.MeshBasicMaterial( { map: textureLoader.load( 'images/ny.jpg' ) } ), // bottom
        new THREE.MeshBasicMaterial( { map: textureLoader.load( 'images/pz.jpg' ) } ), // back
        new THREE.MeshBasicMaterial( { map: textureLoader.load( 'images/nz.jpg' ) } )  // front
    ];
    mesh = new THREE.Mesh( new THREE.BoxGeometry( 20000, 20000, 20000, 7, 7, 7 ), new THREE.MultiMaterial( materials ) );
    mesh.scale.x = - 1;
    scene.add(mesh);
}


/*
 * Adds the Physijs base that the falling objects will hit. This includes
 * the boat model and the Physijs floor that sits inside it.
 */
function addBase() {
    // Ground
    ground_material = Physijs.createMaterial(
        new THREE.MeshLambertMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0 }),
        .8, // high friction
        .3 // low restitution
    );
    // ground_material.map.wrapS = ground_material.map.wrapT = THREE.RepeatWrapping;
    // ground_material.map.repeat.set( 3, 3 );
    
    ground = new Physijs.BoxMesh(
        new THREE.BoxGeometry(290, 1, 140),
        ground_material,
        0 // mass
    );

    ground.name = "floor";
    ground.receiveShadow = true;
    ground.position.y = 30;
    ground.__dirtyPosition = true;
    scene.add( ground );

    var texture = new THREE.TextureLoader().load( 'images/crate.gif' );

    // BEGIN Clara.io JSON loader code
    var objectLoader = new THREE.ObjectLoader();
    objectLoader.load("/json/pirate-ship-fat.json", function ( obj ) {
        boat = obj.children[0];

        boat.material.map = texture;
        boat.scale.set(100, 100, 100);
        boat.position.set(-40, -20, 5);
        // boat.rotation.z = 1.58;

        scene.add( boat );
    } );
}


/**
 * Creates and adds the water simulation. The 'movement' is updated
 * in the render function.
 */
function addWater() {
    waterNormals = new THREE.TextureLoader().load( '../images/waternormals.jpg' );
    waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping;
    water = new THREE.Water( renderer, camera, scene, {
        textureWidth: 512,
        textureHeight: 512,
        waterNormals: waterNormals,
        alpha:  1.0,
        sunDirection: light.position.clone().normalize(),
        sunColor: 0xffffff,
        waterColor: 0x001e0f,
        distortionScale: 50.0,
    } );
    mirrorMesh = new THREE.Mesh(
        new THREE.PlaneBufferGeometry( parameters.width * 500, parameters.height * 500 ),
        water.material
    );
    mirrorMesh.add( water );
    mirrorMesh.rotation.x = - Math.PI * 0.5;
    scene.add( mirrorMesh );
}


/**
 * Called when an object in the scene collides with another object.
 * Used to move the floor down or up whenever it is hit by a falling
 * object.
 */
function handleCollision( upLift ) {

    // If the boat is still submerged, check whether it should
    // be raised up, or sunk down. If it's out of the water, 
    // remove the PhysiJS floor and stop the feed of cubes.
    if ( boat.position.y < 10 ) {

        if ( boat.position.y > -45 ) {
            ground.position.y -= upLift ? -1 : 1;
            ground.__dirtyPosition = true;

            // You may also want to cancel the object's velocity
            ground.setLinearVelocity(new THREE.Vector3(0, 0, 0));
            ground.setAngularVelocity(new THREE.Vector3(0, 0, 0));

            boat.position.y -= upLift ? -1 : 1;
            scene.simulate();
        } else {
            feedMutex = true;
            done = true;
            scene.remove( ground );
            sinkShip();
        }
        
    } else {
        feedMutex = true;
        done = true;
        scene.remove( ground );
        rotateShip();
    }

    renderer.render( scene, camera );
}


/**
 * Creates a new Physijs box mesh each time it is called. Depending
 * on the tweet content, the box may be one color or another, and
 * will raise the floor up or down.
 *
 * @param     data : Tweet object
 */
function createBox(data) {

    var box, material, color,
        mutex = true,
        tweetLen = data.body.length;

    switch (data.tone) {
        case 0: // bad
            // console.log("bad tweet");
            color = 0xff0000;
            break;
        case 1: // good
            // console.log("good tweet");
            color = 0x00ff00;
            break;
        case 2: // good and bad
            // console.log("good and bad tweet");
            color = 0x0000ff;
            break;
        default:
            // console.log("uninteresting tweet");
            return;
    }

    
    var box_geometry = new THREE.BoxGeometry( tweetLen/10, tweetLen/10, tweetLen/10 );

    material = Physijs.createMaterial(
        new THREE.MeshLambertMaterial({ color: color }),
        .6, // medium friction
        .3 // low restitution
    );
    // material.map.wrapS = material.map.wrapT = THREE.RepeatWrapping;
    // material.map.repeat.set( .5, .5 );
    
    //material = new THREE.MeshLambertMaterial({ map: THREE.ImageUtils.loadTexture( 'images/rocks.jpg' ) });
    
    box = new Physijs.BoxMesh(
        box_geometry,
        material
    );

    box.addEventListener( 'collision', function() {
        if ( mutex ) {
            mutex = false;
            handleCollision(data.tone === 0 ? false : true);
        }
    });

    box.collisions = 0;
    box.name = "tweet-box";

    box.position.set(
        0,
        200,
        0
    );
    
    box.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
    );
    
    box.castShadow = true;
    
    objects.push( box );
    scene.add( box );

};// END create box


/**
 * Removes all of the physiJS boxes from the scene.
 */
function removeBoxes() {
    for ( var i = 0; i < objects.length; i++ ) {
        scene.remove( objects[i] );
    }
}


/**
 * Rotates the ship to face away from the user and then calls
 * the function to move the ship out to sea.
 */ 
function rotateShip() {
    new TWEEN.Tween(boat.rotation)
        .to({
            z: -4.8
        }, 3000)
        .easing( TWEEN.Easing.Linear.None )
        .onStart( function() {  
            removeBoxes();
        })
        .onUpdate( function() {
            renderer.render(scene, camera);
        })
        .onComplete( function() {
            slideShip();
            fadeShip();
        })
        .start();
}


/**
 * Called after the ship is rotated, this function tweens its
 * z position to move it away from the user.
 */ 
function slideShip() {
    new TWEEN.Tween(boat.position)
        .to({
            z: -5000
        }, 10000)
        .easing( TWEEN.Easing.Linear.None )
        .onStart( function() {
            boat.material.transparent = true;
        })
        .onUpdate( function() {
            renderer.render(scene, camera);
        })
        .onComplete( function() {

        })
        .start();
}


/**
 * Called after the ship is rotated, this function tweens its
 * opacity so the ship is faded out.
 */ 
function fadeShip() {
    new TWEEN.Tween(boat.material)
        .to({
            opacity: 0
        }, 10000)
        .easing( TWEEN.Easing.Linear.None )
        .onStart( function() {
            boat.material.transparent = true;
        })
        .onUpdate( function() {
            renderer.render(scene, camera);
        })
        .onComplete( function() {
            
        })
        .start();
}


/**
 * Called when the ship has sunk low enough, this function sinks the
 * ship down all the way, so it is below the water.
 */ 
function sinkShip() {
    new TWEEN.Tween(boat.position)
        .to({
            y: -300
        }, 4000)
        .easing( TWEEN.Easing.Quartic.In )
        .onStart( function() {
            removeBoxes();
        })
        .onUpdate( function() {
            renderer.render(scene, camera);
        })
        .onComplete( function() {
        })
        .start();
}


/**
 * Used to display the search box on the page. Handles the addition
 * of classes that animate the search box, and reloading the page
 * with the entered searh term.
 */
function handleSearchTerm() {

    var $searchWrapper = $(".search-wrapper");

    $(document).on('click', function(event) {
        
        if ( $searchWrapper.hasClass("active") ) {

            // Use the value if there is one; remove the search box if not
            if ( $(".search-box").val() ) {
                location.search = 'term=' + $(".search-box").val();
            } else {
                $searchWrapper.removeClass("active");
            }

        }
        
    });

    // Toggles the search display and functionality
    $("#searchIcon").click( function( event ) {
        event.stopPropagation();

        if ( $searchWrapper.hasClass("active") ) {

            // Use the value if there is one; remove the search box if not
            if ( $("#searchBox").val() ) {
                location.search = 'term=' + $(".search-box").val();
            } else {
                $searchWrapper.removeClass("active");
            }

        } else {
            $searchWrapper.addClass("active");
            $(".search-box").focus();
        }

    });

    // If the enter key is pressed, check to see if a value should submit.
    $("#searchBox").keypress(function(event) {

        if (event.which == 13) {
            event.preventDefault();

            if ( $("#searchBox").val() ) {
                location.search = 'term=' + $(".search-box").val();
            }

        }

    });

    // Stop the document handler from seeing any click in the search box
    $("#searchBox").click( function( event ) { event.stopPropagation(); });
}


/**
 * Called when there is an intersection. Pauses the current animation and
 * displays the text corresponding to the hovered cube. 
 */
function onIntersection( object ) {
    if ( INTERSECTED ) INTERSECTED.material.emissive.setHex( INTERSECTED.currentHex );

    INTERSECTED = object;
    INTERSECTED.currentHex = INTERSECTED.material.emissive.getHex();
    INTERSECTED.material.emissive.setHex( 0xffffff );
    paused = true;

    var index = objects.indexOf( object ),
        tone  = tweets[index].tone;

    console.log(tone);

    $($("#tweets li")[objects.length - index - 1])
        .addClass( tone === 0 ? "bad" : (tone === 1 ? "good" : "neutral") );

}


/**
 * Called when there aren't any intersections. Performs default behavior. 
 */
function onNoIntersections() {
    if ( INTERSECTED ) INTERSECTED.material.emissive.setHex( INTERSECTED.currentHex );
    INTERSECTED = null;
    paused = false;

    // runs the physics engines
    scene.simulate( undefined, 1 );

    $("#tweets li").removeClass();
}


/**
 * Called about 60 times per second, this function handles anything that
 * needs updating constantly for animation.
 */
render = function() {
    requestAnimationFrame( render );
    TWEEN.update();
    water.material.uniforms.time.value += 1.0 / 60.0;
    controls.update();
    water.render();
    renderer.render( scene, camera );

    // find intersections
    raycaster.setFromCamera( mouse, camera );

    var intersects = raycaster.intersectObjects( objects, true );


    // Make sure something was intersected
    if ( intersects.length > 0 ) {

        // if a different object is hovered on and it's a tweet box..
        if ( INTERSECTED != intersects[ 0 ].object ) {
            onIntersection( intersects[ 0 ].object );
        }

    } else {
        onNoIntersections();
    }

};


// Called when everything is loaded
$(window).load( function () {
    initScene();
    handleSearchTerm();
});

