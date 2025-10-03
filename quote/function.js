//設定cookie
function setCookie(cname, cvalue, exdays) {
	var d = new Date();
	d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
	if (exdays != null && exdays > 0) {
		var expires = "expires=" + d.toUTCString();
		document.cookie = cname + "=" + cvalue + ";" + expires;
	} else {
		document.cookie = cname + "=" + cvalue;
	}
}

//取得cookie
function getCookie(cname) {
	var name = cname + "=";
	var ca = document.cookie.split(';');
	for (var i = 0; i < ca.length; i++) {
		var c = ca[i];
		while (c.charAt(0) == ' ') c = c.substring(1);
		if (c.indexOf(name) != -1) return c.substring(name.length, c.length);
	}
	return "";
}

//刪除cookie
function delCookie(name) {
	var exp = new Date();
	exp.setTime(exp.getTime() - 1);
	var cval = getCookie(name);
	if (cval != null) document.cookie = name + "=" + cval + ";expires=" + exp.toGMTString();
}

//將實體化的html轉換為符號
function html_decode(string, quote_style) {
	var optTemp = 0,
		i = 0,
		noquotes = false;
	if (typeof quote_style === 'undefined') quote_style = 2;
	string = string.toString()
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>');
	var OPTS = {
		'ENT_NOQUOTES': 0,
		'ENT_HTML_QUOTE_SINGLE': 1,
		'ENT_HTML_QUOTE_DOUBLE': 2,
		'ENT_COMPAT': 2,
		'ENT_QUOTES': 3,
		'ENT_IGNORE': 4
	};
	if (quote_style === 0) noquotes = true;
	if (typeof quote_style !== 'number') {
		quote_style = [].concat(quote_style);
		for (i = 0; i < quote_style.length; i++) {
			if (OPTS[quote_style[i]] === 0) noquotes = true;
			else if (OPTS[quote_style[i]]) optTemp = optTemp | OPTS[quote_style[i]];
		}
		quote_style = optTemp;
	}
	if (quote_style & OPTS.ENT_HTML_QUOTE_SINGLE) string = string.replace(/&#0*39;/g, "'");
	if (!noquotes) string = string.replace(/&quot;/g, '"');
	string = string.replace(/&amp;/g, '&');
	return string;
}

//JS版的nl2br()
function nl2br(str, is_xhtml) {
	var breakTag = (is_xhtml || typeof is_xhtml === 'undefined') ? '<br ' + '/>' : '<br>';
	return (str + '')
		.replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + breakTag + '$2');
}

//購物車
function cart(id, mode, count) {
	id = id || 0;
	mode = mode || 1;
	count = count || 1;
	$.ajax({
		type: "POST",
		url: "quote/cart.php",
		dataType: "text",
		data: {
			"id": id,
			"mode": mode,
			"count": count
		},
		success:
			function (msg) {
				if (id == 0) {
					if (msg == 0) $(".cart_sum").html("");
					else $(".cart_sum").html(msg);
				} else {
					if (mode == 1) alert("已加入報名清單。 \r Added to the registration list.");
					cart();
				}
			}
	});
};

//語系設定
var lang = "";
$(function () {
	var getUrlString = location.href;
	var url = new URL(getUrlString);
	lang = url.searchParams.get('lang');
	if (!lang) lang = "tw";
	$('a.langUrl,nav .mmenu a:not(.hasmenu),footer .sitemap a').each(function () {
		let olink = $(this).attr('href');
		if (olink.indexOf('?') != -1) {
			$(this).attr("href", olink + '&lang=' + lang);

		} else {
			$(this).attr("href", olink + '?lang=' + lang);
		}
	})
});
function lang_set(ver) {
	// setCookie("lang", ver, 1);
	let url = location.href;
	let newURL = url.split("lang");
	if (url.indexOf('lang') != -1) {
		window.location = newURL[0] + "lang=" + ver
	} else {
		if (url.indexOf('?') != -1) {
			window.location = newURL[0] + "&lang=" + ver
		} else {
			window.location = newURL[0] + "?lang=" + ver
		}
	}

};
//訂閱電子報
function edm(email) {
	var error_msg = [
		{ "tw": "請填寫正確Email", "en": "Please fill in the correct email.", "jp": "Please fill in the correct email." },
		{ "tw": "訂閱成功。", "en": "Successfully subscribed.", "jp": "Successfully subscribed." },
		{ "tw": "您已訂閱過", "en": "You have subscribed!", "jp": "You have subscribed!" },
	];
	var emailform = /^([a-zA-Z0-9]+[_|\_|\-|\.]?)*[a-zA-Z0-9]+@([a-zA-Z0-9]+[_|\_|\-|\.]?)*[a-zA-Z0-9]+\.[a-zA-Z]{2,6}$/;
	if (!emailform.test(email)) {
		alert(error_msg[0][lang]);
	} else {
		$.post("quote/subscription.php", {
			mail: email
		}, function (data) {
			if (data.status) {
				if (data.finish) {
					alert(error_msg[1][lang]);
					$('#footer_mail').val("");
				} else alert(error_msg[2][lang])
			} else alert(error_msg[0][lang]);

		}, "json");
	}
}

//表單欄位驗證
//type 1:input   2:mail  3:radio  4:checkbox  5:textarea  6:select
var id_name = "";
function check(id, type, error) {
	var emailform = /^([a-zA-Z0-9]+[_|\_|\-|\.]?)*[a-zA-Z0-9]+@([a-zA-Z0-9]+[_|\_|\-|\.]?)*[a-zA-Z0-9]+\.[a-zA-Z]{2,3}$/;
	type = type || 1;
	error = error || "必填";
	errorHead = "";
	switch (type) {
		case 1:
			if ($("input[name='" + id + "']").val() == "") {
				checknot(id, errorHead, error);
			} else checkok(id);
			break;
		case 2:
			if (!emailform.test($("input[name='" + id + "']").val())) {
				checknot(id, errorHead, error);
				id_name = id;
			} else checkok(id);
			break;
		case 3:
			if ($("input[name='" + id + "']:checked").val() == null) {
				checknot(id, errorHead, error);
				id_name = id;
			} else checkok(id);
			break;
		case 4:
			if ($("input[name='" + id + "[]']:checked").val() == null) {
				checknot(id, errorHead, error);
				id_name = id;
			} else checkok(id);
			break;
		case 5:
			if ($("textarea[name='" + id + "']").val() == "") {
				checknot(id, errorHead, error);
				id_name = id;
			} else checkok(id);
			break;
		case 6:
			if ($("select[name='" + id + "']").val() == null) {
				checknot(id, errorHead, error);
				id_name = id;
			} else checkok(id);
			break;
		case 7:
			let vad = $("input[name='" + id + "']").val();
			if (vad === error) {
				$("#" + id + "_span").html("").removeClass('required-txt');
			} else {
				$("#" + id + "_span").html("驗證碼有誤").addClass('required-txt');;
				id_name = id;
			}
			break;
	}
}
function checknot(id, errorHead, error) {
	$("#" + id + "_span").html(errorHead + error);
	$("#" + id + "_span").parent().addClass('with-errors');
	id_name = id;
}
function checkok(id) {
	$("#" + id + "_span").html("");
	$("input[name='" + id + "']").parent().removeClass('with-errors');
}

/*生成6位隨機數*/
var validate = "";
function rand() {
	validate = "";
	// 大小寫英文 數字 排除 I l o O 0  ,並重複數字 增加出現機率
	var str = "123456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ123456789";
	var arr = str.split("");
	var ranNum;
	for (var i = 0; i < 6; i++) {
		ranNum = Math.floor(Math.random() * 66); //隨機數在[0,65]之間
		validate += arr[ranNum];
	}
	return validate;
}