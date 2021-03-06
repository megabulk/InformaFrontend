jQuery(document).ready(function($) {
	$( '#tabs' ).find( '.controls' ).find( 'a' ).click( function( e ){
		
		e.preventDefault();
	
		var el = $( this ); 
	
		$( '#tabs' ).find( '.controls' ).find( 'li' ).removeClass( 'active' );
		el.parent( 'li' ).addClass( 'active' );
	
		$( '#tabs' ).find( 'div' ).removeClass( 'active' );
		$( '#tabs' ).find( el.attr( 'href' ) ).addClass( 'active' );

		$('#ic_search_button')
			.before($($("input[name='_xsrf']")[0]).clone());
	
	} );
	
	$("#ic_url_search_button").click(function() {
			//alert($("#ic_search_url").val());
			return doInnerAjax("SubmitViaURL", "post", {
			url : $("#ic_search_url").val() }, function(message){
				console.log(message);
			
				try {
					json = JSON.parse(message.responseText);
				} catch(err) {
					alert("Could not upload file from URL!");
					return;
				}
			
				if(json.result == 200) {
					path = json.data.mime_type !== undefined && json.data.mime_type.indexOf("application/pgp") > -1 ? "/source/" : "/submission/";
					location.href = path + json.data._id + '/';
				} else {
					alert("Could not upload file from URL!");
				}
			
			});
		});
	
	
	discoverICDropzones({url : "/import/"}, "#ic_import_dropzone_holder",
		function(file, message) {
			// onSuccess
			console.log(message);
			path = message.data.mime_type !== undefined && message.data.mime_type.indexOf("application/pgp") > -1 ? "/source/" : "/submission/";
			location.href = path + message.data._id + '/';
		},
		function(file, message) {
			// onError
			console.error(message);
			messagetext = '';
			if (typeof message !== null && typeof message === 'object') {
				if (message.result == 403) {
					messagetext = "It's not you, it's us. We're looking into the problem. Please try again later. (" + message.result + ")";
					this.disable();
				}
			} else {
				messagetext = message;
			}
			return file.previewElement.querySelector("[data-dz-errormessage]").textContent = messagetext;
		});

});

