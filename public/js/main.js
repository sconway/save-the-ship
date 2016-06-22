'use strict';
    
Physijs.scripts.worker = '../js/physijs_worker.js';
Physijs.scripts.ammo = '../js/ammo.js';

var initScene, render, boxes = [], spawnBox, loader,
    renderer, render_stats, physics_stats, scene, ground_material, 
    ground, upGround, light, camera, water, mirrorMesh, light, controls,
    spacesphere,
    numCubes = 0;


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
    scene.addEventListener('update', function() {
        scene.simulate( undefined, 1 );
    });

    
    
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
    // controls.target.set( 0, 500, 0 );
    

    
    var socket = io.connect();
    // var socket = io.connect('http://localhost:1243');
    // var socket = io();
    var self = this;

    socket.on('tweet', function (data) {
      console.log("received tweet");
      boxes.push(data);
    });
    
    requestAnimationFrame( render );
    scene.simulate();
    initFeed();
};


/**
 * This function runs every second and grabs the current piece of data
 * from the array. It uses that data to create a box on the scene. 
 */
function initFeed() {
    setInterval(function() {
        if ( boxes[numCubes] ) {
            console.log("getting box: ", numCubes);
            createBox(boxes[numCubes]);
            prependText(boxes[numCubes]);
            numCubes++;
        }
    }, 1000);
}


/**
 * Prepends the tweet text to the tweets container each time
 * it is called. 
 */
function prependText(tweet) {
    console.log("appending tweet");
    var $li = "<li>" + tweet.body + "</li>";

    $("#tweets").prepend( $li );
}


function addCamera() {
    camera = new THREE.PerspectiveCamera(
        35,
        window.innerWidth / window.innerHeight,
        1,
        100000
    );
    camera.position.set( 0, 250, 2500 );
    camera.lookAt( scene.position );
    scene.add( camera );
}


function addLight() {
    scene.add( new THREE.AmbientLight( 0x444444 ) );
    light = new THREE.DirectionalLight( 0xffffbb, 1 );
    light.position.set( 0, 500, 0 );
    scene.add( light );
}


function addSphereContainer() {
    var spacetex = THREE.ImageUtils.loadTexture('../images/earth-moon.jpg');
    spacetex.wrapS = spacetex.wrapT = THREE.RepeatWrapping;
    var spacesphereGeo = new THREE.SphereGeometry(5000,64,64);
    var spacesphereMat = new THREE.MeshBasicMaterial({ 
        map: spacetex,
        side: THREE.DoubleSide
    });

    spacesphere = new THREE.Mesh(spacesphereGeo,spacesphereMat);
    spacesphere.position.z = -1000
    spacesphere.rotation.x = 0.25;
    spacesphere.rotation.y = 7;
    spacesphere.rotation.z = 0.75;

    spacesphere.name = "space";
    scene.add(spacesphere);
}


function addBase() {
    // Ground
    ground_material = Physijs.createMaterial(
        new THREE.MeshLambertMaterial({ color: 0x0000ff }),
        .8, // high friction
        .3 // low restitution
    );
    // ground_material.map.wrapS = ground_material.map.wrapT = THREE.RepeatWrapping;
    // ground_material.map.repeat.set( 3, 3 );
    
    ground = new Physijs.BoxMesh(
        new THREE.BoxGeometry(1000, 100, 500),
        ground_material,
        0 // mass
    );

    ground.name = "floor";
    ground.receiveShadow = true;
    ground.position.y = 0;
    // ground.position.z = 500;
    scene.add( ground );
}


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

    ground.position.set( 
        0, 
        upLift ? ground.position.y + 1 : ground.position.y - 1, 
        0 );
    ground.__dirtyPosition = true;

    // You may also want to cancel the object's velocity
    ground.setLinearVelocity(new THREE.Vector3(0, 0, 0));
    ground.setAngularVelocity(new THREE.Vector3(0, 0, 0));

    scene.simulate();
    renderer.render( scene, camera );
}


// /**
//  * Determines whether or not a tweet is 'good'
//  */
// function tweetTone(tweet) {
//     var text   = tweet.toLowerCase(),
//         isGood = text.indexOf("love") >= 0,
//         isBad  = text.indexOf("hate") >= 0,
//         isNeutral = isGood && isBad;

//     if ( isNeutral ) {
//         return 2;
//     } else if ( isGood ) {
//         return 1;
//     }else if ( isBad ) {
//         return 0;
//     }
// }


/**
 * Creates a new Physijs box mesh each time it is called. Depending
 * on the tweet content, the box may be one color or another, and
 * will raise the floor up or down.
 *
 * @param     data : Tweet object
 */
function createBox(data) {
    // console.log("creating box");
    var box, material, color,
        mutex = true,
        // tone  = tweetTone(data.text),
        tweetLen = data.body.length;

    switch (data.tone) {
        case 0: // bad
            console.log("bad tweet");
            color = 0xff0000;
            // box.addEventListener( 'collision', function() {
            //     if ( mutex ) {
            //         mutex = false;
            //         handleCollision(true);
            //     }
            // });
            break;
        case 1: // good
            console.log("good tweet");
            color = 0x00ff00;
            // box.addEventListener( 'collision', function() {
            //     if ( mutex ) {
            //         mutex = false;
            //         handleCollision(false);
            //     }
            // });
            break;
        case 2: // good and bad
            console.log("good and bad tweet");
            color = 0x0000ff;
            break;
        default:
            // console.log("uninteresting tweet");
            return;
    }

    
    var box_geometry = new THREE.BoxGeometry( tweetLen/4, tweetLen/4, tweetLen/4 );

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
            handleCollision(false);
        }
    });

    box.collisions = 0;

    box.position.set(
        Math.random() * 100 - 50,
        500 + (Math.random() * 100 - 50),
        0
    );
    
    box.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
    );
    
    box.castShadow = true;
    
    scene.add( box );
    // console.log("added box");

};// END create box


/**
 * Used to display the search box on the page. Handles the addition
 * of classes that animate the search box, and reloading the page
 * with the entered searh term.
 */
function handleSearchTerm() {
    var $searchWrapper = $(".search-wrapper");

    $("#searchIcon").on('click', function() {
        
        if ( $searchWrapper.hasClass("active") ) {
            if ($(".search-box").val()) {
                location.search = 'term=' + $(".search-box").val();
            } else {
                $searchWrapper.removeClass("active");
            }
        } else {
            $searchWrapper.addClass("active")
        }
        
    });
}


render = function() {
    requestAnimationFrame( render );
    water.material.uniforms.time.value += 1.0 / 60.0;
    controls.update();
    water.render();
    renderer.render( scene, camera );
};

$(window).load(function() {
    initScene();
    handleSearchTerm();
});

