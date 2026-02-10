$(document).ready(async function () {

    let doc_data = await loadJson();
    let doc_post;

    let loc = window.location.search.replace("?", "");
    if (loc != "") {
        doc_post = await postRender(loc);

    } else {
        doc_post = await postRender('0_0');
    }

    $(window).on("popstate", async function (e) {
        let loc = window.location.search.replace("?", "");
        if (loc != "") {
            doc_post = await postRender(loc);

        } else {
            doc_post = await postRender('0_0');
        }
    });

    if (window.location.origin.indexOf("github") == -1) $('.navbarCRUD').css('visibility', 'visible');


    async function fetchJsonWithProgress(url, onProgress) {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const total = Number(res.headers.get("Content-Length")) || 0;

        // Если стриминга нет
        if (!res.body || !res.body.getReader) {
            const json = await res.json();
            // финальный апдейт: всё получено
            onProgress?.(total || 0, total || 0);
            return json;
        }

        const reader = res.body.getReader();
        const chunks = [];
        let received = 0;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            chunks.push(value);
            received += value.length;

            // Всегда отдаём только байты.
            // UI пусть показывает "received KB" и игнорирует проценты.
            onProgress?.(received, total);
        }

        // Склеиваем и парсим
        const all = new Uint8Array(received);
        let pos = 0;
        for (const c of chunks) {
            all.set(c, pos);
            pos += c.length;
        }

        const text = new TextDecoder("utf-8").decode(all);
        return JSON.parse(text);
    }

    async function loadJson() {
        $('.loader_screen').css('display', 'flex');
        $('body').css('overflow', 'hidden');

        // let response = await fetch('data/data.json?nocache=' + (new Date()).getTime());
        //  let sidebar = await response.json();

        const bar = document.getElementById("bar");
        const pct = document.getElementById("pct");

        const sidebar = await fetchJsonWithProgress(
            `data/data.json?nocache=${Date.now()}`,
            (loaded, total) => {
                //   if (!total) {

                // $('.bar').css('display', 'none');
                //   $('.progress').css('display', 'none');
                // нет Content-Length: показываем “примерно” или просто анимацию
                pct.textContent = `${Math.round(loaded / 1024)} КБ`;
                return;
                /*    }
                    $('.progress').css('display', 'block');
                    $('.bar').css('display', 'block');
                    const p = Math.round((loaded / total) * 100);
                    bar.style.width = p + "%";
                    pct.textContent = p + "%";*/
            }
        );

        let html = '';
        $('.category_id').html('');
        $.each(sidebar, function (key, val) {
            html += `<details style="border: 1px solid rgba(255, 247, 247, 0.35);" data-id="` + key + `" class="mt-3">
                    <summary class="" style="border-radius: 4px; background-color: #333333; color:#9A9DA0;">` + val['header'] + `</summary>`;
            $('.category_id').append('<option value="' + key + '">' + val['header'] + '</option>');

            $.each(val['links'], function (key2, val2) {
                html += `<div class="card-body">
                <a class=" postlink" style="color:#B9B384; word-break: break-word;" data-action="` + key + `_` + key2 + `" href="#">` + val2['title'] + `</a></div>`;
            });
            html += '</details>';
        });
        $('.sidebar').html(html);

        $('.loader_screen').addClass('hide');
        $('body').css('overflow', 'visible');

        $('.loader_screen').one('transitionend', function () {
            $(this).css('display', 'none');
            $('body').css('overflow', 'visible');
        });

        return sidebar;
    }

    function enhanceImages(item) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(item, "text/html");

        const imgs = doc.querySelectorAll("img");

        imgs.forEach(img => {

            img.setAttribute("data-target", "#imageModal");
            img.setAttribute("onclick", "showImage(this.src)");
            img.style.cursor = "pointer";
            img.style.maxWidth = "500px";
            img.style.maxHeight = "400px";
            img.style.objectFit = "fill;";
            img.classList.add("mx-auto", "d-block");
        });

        return doc.body.innerHTML;
    }



    async function postRender(action) {
        let docParrent = action.split('_')[0];
        let docChild = action.split('_')[1];

        $('details').removeAttr('open');
        $('details[data-id=' + docParrent + ']').attr('open', 'open');
        $('.postlink').removeClass('font-weight-bold');
        //  $('.postlink').removeClass('text-primary');
        //  $('.postlink[data-action=' + action + ']').addClass('text-primary');
        $('.postlink[data-action=' + action + ']').addClass('font-weight-bold');

        $(".content-data").fadeOut(function () {
            $('.title').text(doc_data[docParrent]['links'][docChild]['title']);
            $('.path').text(doc_data[docParrent]['links'][docChild]['data']['path']);
            $('.code').html(doc_data[docParrent]['links'][docChild]['data']['code']);
            doc_data[docParrent]['links'][docChild]['data']['description'] = enhanceImages(doc_data[docParrent]['links'][docChild]['data']['description']);
            $('.description').html(doc_data[docParrent]['links'][docChild]['data']['description'].replace(/\n/g, '<br/>'));
            $('.edit').data('id', action);
            $('.delete').data('id', action);
            $('.content-data').fadeIn("slow");
            $('.code').removeClass("prettyprinted");

            PR.prettyPrint();

            /*Prism.hooks.add('before-sanity-check', function (env) {
              env.element.innerHTML = env.element.innerHTML.replace(/<br>/g, '\n');
              env.code = env.element.textContent;
            });*/

            /*			Prism.plugins.NormalizeWhitespace.setDefaults({
                                    'remove-trailing': true,
                                    'remove-indent': true,
                                    'left-trim': true,
                                    'right-trim': true,
                                    'break-lines': 60, //max number of characters in each line before break
                        });*/

            Prism.hooks.add('before-sanity-check', function (env) {
                env.element.innerHTML = env.element.innerHTML.replace(/<br>/g, '\n');

                env.code = env.element.textContent;
            });
            Prism.highlightAll()


            if (doc_data[docParrent]['links'][docChild]['data']['path'].length <= 1) {
                $('.path').css('visibility', 'hidden')
                $('.main-content').css('display', 'none')

            } else {
                $('.path').css('visibility', 'visible')
                $('.main-content').css('display', 'block')
            }

            if (doc_data[docParrent]['links'][docChild]['data']['code'].length <= 1) {
                $('.code').css('visibility', 'hidden')
                $('.main-content').css('display', 'none')
            } else {
                $('.code').css('visibility', 'visible')
                $('.main-content').css('display', 'block')
            }

            return doc_data[docParrent]['links'][docChild]['data'];
        });
        $('html, body').animate({
            scrollTop: 0
        }, 500);
    }

    async function getPost(action) {
        let docParrent = action.split('_')[0];
        let docChild = action.split('_')[1];
        return doc_data[docParrent]['links'][docChild];
    }

    async function sync() {
        await postData('post.php', doc_data)
            .then((data) => {
                //console.log(data);
            });
        doc_data = await loadJson();
    }

    $('form').submit(async function (e) {
        e.preventDefault();
        let values = $(this).serializeArray();
        let data = {};
        $.each(values, function (k, v) {
            data[v.name] = v.value;
        });
        switch (data['action']) {
            case 'addCategory': {
                let newitem = doc_data.length;
                doc_data[newitem] = {};
                doc_data[newitem]['header'] = data['categoryName'];
                sync();
                $('#addCategory').modal('hide');
                $(this).find('#categoryName').val('');
                break;
            }
            case 'deleteCategory': {
                doc_data.splice(parseInt(data['category_id']), 1);
                await sync();
                doc_post = await postRender('0_0');
                $('#deleteCategory').modal('hide');
                break;
            }
            case 'editCategory': {
                doc_data[parseInt(data['category_id'])]['header'] = data['categoryName'];
                await sync();
                doc_post = await postRender('0_0');
                $('#editCategory').modal('hide');
                $('#edit_catrgoryName').val('');
                break;
            }
            case 'addPost': {
                let category = data['category_id'];
                let links = {};
                if (doc_data[category]['links'] == null) doc_data[category]['links'] = [];
                links['title'] = data['title'];
                links['data'] = {};
                links['data']['code'] = data['code'];
                links['data']['description'] = data['description'];
                links['data']['path'] = data['path'];
                doc_data[category]['links'].push(links);
                await sync();
                let index = doc_data[category]['links'].length - 1;
                let temp = category + '_' + index;
                doc_post = await postRender(temp);
                $('#addPost').modal('hide');
                $(this).find('#code').val('');
                $(this).find('#description').val('');
                $(this).find('#path').val('');
                $(this).find('#title').val('');
                break;
            }
            case 'editPost': {
                let docParrent = data['post_id'].split('_')[0];
                let docChild = data['post_id'].split('_')[1];
                doc_data[docParrent]['links'][docChild]['title'] = data['title'];
                doc_data[docParrent]['links'][docChild]['data']['code'] = data['code'];
                doc_data[docParrent]['links'][docChild]['data']['description'] = data['description'];
                doc_data[docParrent]['links'][docChild]['data']['path'] = data['path'];
                await sync();
                doc_post = await postRender(data['post_id']);
                $('#editPost').modal('hide');
                break;
            }
            case 'deletePost': {
                let docParrent = data['post_id'].split('_')[0];
                let docChild = data['post_id'].split('_')[1];
                doc_data[docParrent]['links'].splice(parseInt(docChild), 1);
                await sync();
                doc_post = await postRender('0_0');
                $('#deletePost').modal('hide');
                break;
            }
            default: {
                console.error('Неопределён тип отправки');
                break;
            }
        }
    });

    async function postData(url = '', data = {}) {
        const response = await fetch(url, {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json'
            },
            redirect: 'follow',
            referrerPolicy: 'no-referrer',
            body: JSON.stringify(data)
        });
        return await response;
    }

    $(".sidebar").on("click", ".postlink", async function (e) {
        e.preventDefault();
        window.history.pushState("", "", window.location.pathname + "?" + $(this).data('action'));
        $('.navbar-collapse').collapse('hide');
        await postRender($(this).data('action'));
    });

    $('.edit').click(async function (e) {
        e.preventDefault();
        data = await getPost($(this).data('id'));
        $('#post_id_edit').val($(this).data('id'));
        $('#edit_title').val(data['title']);
        $('#edit_description').val(data['data']['description']);
        $('#edit_code').val(data['data']['code']);
        $('#edit_path').val(data['data']['path']);
        $('#editPost').modal('show');
    });

    $('.delete').click(async function (e) {
        console.log($(this));
        e.preventDefault();
        $('#deletePost').modal('show');
        $('#post_id').val($(this).data('id'));
    });



    // Функция для сброса и запуска анимации
    function resetSweepAnimation(details) {
        const $content = $(details).children('summary').nextAll();
        $content.each(function () {
            this.style.animation = 'none';
            void this.offsetWidth;
            this.style.animation = 'sweepin 0.5s ease-in-out';
        });
    }

    // Делегируем toggle на .description
    $('.description').on('click', 'details > summary', function () {
        const details = this.parentElement;
        setTimeout(() => {
            if (details.open) { // теперь состояние правильное
                const $content = $(details).children('summary').nextAll();
                $content.each(function () {
                    this.style.animation = 'none';
                    void this.offsetWidth; // принудительный reflow
                    this.style.animation = 'sweepin 0.5s ease-in-out';
                });
            }
        }, 0);
    });
});