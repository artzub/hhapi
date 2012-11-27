/**
 * User: Artem Zubkov
 * Date: 27.11.12
 * Time: 0:42
 * Description: Widget for search jobs on http://hh.ru
 */

/**
 * JSONP
 */

"use strict";
(function(window) {
    if (!window || !window.document)
        return;

    var seq = 0, // sequent
        document = window.document;

    /**
     * JSONP
     * @param {String} uri The URL you are requesting with the JSON data (you may include URL params).
     * @param {Function} callback The callback function which you want to execute for JSON data (JSON response is first argument).
     * @param {Object} params The params contains data about callback param's name, onload function and onerror function.
     * Params have next structure:
     * params = {
     *      callbackParam : '', default is callback
     *      onerror_callback : function() {},
     *      onload_callback : function() {},
     *      script_order : 'defer' | 'async' (is default)
     *}
     */
    window.JSONP = window.JSONP || function(uri, callback, params) {
        if (!arguments.length || arguments.length < 2)
            return;

        uri = uri || '';
        callback = callback || function() {};
        params = params || {};

        params.callbackParam = params.callbackParam || 'callback'

        uri += uri.indexOf('?') === -1 ? '?' : '&';

        function clear() {
            try {
                delete window[id];
            } catch(e) {
                window[id] = null;
            }
            document.documentElement.removeChild(script);
        }

        function response() {
            clear();
            callback.apply(this, arguments);
        }

        function doError() {
            clear();
            params.onerror && params.onerror.apply(this, arguments);
        }

        function doLoad() {
            params.onload && params.onload.apply(this, arguments);
        }

        var id = '_JSONP_' + seq++,
            script = document.createElement('script');

        window[id] = response;

        params.script_order = params.script_order || 'async';

        script.onload = doLoad;
        script.onerror = doError;
        script.setAttribute(params.script_order, params.script_order);
        script.setAttribute('src', uri + params.callbackParam + '=' + id);

        document.documentElement.insertBefore(
            script,
            document.documentElement.lastChild
        );
    }
})(window);

var HHRU = window.HHRU || {};

HHRU.widget = HHRU.widget || function(selector) {

    if (!window.d3) {
        window.JSONP('http://d3js.org/d3.v2.min.js', function(){}, {
            callbackParams : '2.9.5',
            onload : function() {
                init();
            }
        });
    }
    else
        init();

    var self = this,
        container,
        content,
        loading,
        jobs = [],
        page = 0,
        fdate;

    function getData() {
        if (!(self && content && self['_hh_search'] && self['_hh_period']))
            return;

        var url = 'http://api.hh.ru/1/json/vacancy/search/?',
            text = self['_hh_search'].attr('value') || '',
            period = self['_hh_period'].attr('value') || '';

        text = text !== '' ? 'text=' + encodeURIComponent(text) + '&' : '';
        period = period !== '' ? 'period=' + parseInt(period) + '&' : '';

        //d3.json(url + text + period + 'page=' + page++, function(data) {
        window.JSONP(url + text + period + 'page=' + page++, function(data) {

            if (!data.vacancies || !data.vacancies.length) {
                page = 0;
                loading.style('display', 'none');
                return;
            }

            jobs = jobs.concat(data.vacancies);

            jobs.forEach(function(d) {
                if (typeof d.update !== 'Date') {
                    d.update = new Date(d.update.timestamp * 1000);
                }
            });

            jobs.sort(function(a,b) {
                return b.update - a.update;
            });

            var vac = content.selectAll('li.job')
                .data(jobs, function(d) {
                    return d.id
                });
            vac.enter()
                .insert('li', ':first-child')
                .attr('class', 'job')
                .each(function(d, li) {
                    li = d3.select(this);
                    li.append('div')
                        .attr('class', 'hh_jobtitle')
                        .call(function(div){
                            div.append('a')
                                .attr('href', d.links.alternate.href)
                                .text(d.name);

                            div.append('span')
                                .text(fdate(d.update))
                        });

                    li.append('div')
                        .attr('class', 'hh_jobbody')
                        .call(function(div) {
                            d.employer.logos && d.employer.logos.links.small.href
                                && div.append('img')
                                    .attr('src', d.employer.logos.links.small.href);

                            div.append('div')
                                .call(function(div) {
                                    div.append('a')
                                        .attr('href', d.employer.links.alternate.href)
                                        .text(d.employer.name);
                                    div.append('br');

                                    d.salary && div.append('span')
                                        .attr('class', 'hh_salary')
                                        .text((d.salary.from ? (d.salary.from  + '-') : '') + (d.salary.to || '') + ' ' + (d.salary.currency.name || ''));
                                    div.append('br');

                                    div.append('span')
                                        .text(d.region.name);
                                });
                        });
                });

            vac.order();
        }, {
            onload : function() {
            }
        });
    }

    function button() {
        content && content.selectAll('li.job')
            .remove();
        jobs = [];
        loading.style('display', 'list-item');
        getData();
    }

    function nextData() {
        if (content && loading && loading.node().getBoundingClientRect().top < innerHeight)
            getData();
    }

    function init() {
        container = d3.selectAll(selector);
        fdate =  d3.time.format("%H:%M %d.%m.%y");

        var estyle = document.createElement('style');
        estyle.setAttribute('type', "text/css")
        estyle.appendChild(document.createTextNode('.hh_widget{min-height:370px;min-width:100px;position:relative;width:100%;height:100%;background:rgba(0, 0, 0, 0.1);padding:5px;margin:0;overflow:hidden;border:1px dotted rgba(0, 0, 0, 0.3)}.hh_widget ul{list-style:none;margin:0;padding:0}.hh_widget a{color:#f9f9f9;text-decoration:none;border-bottom:1px dotted #f9f9f9}.hh_widget a:hover{color:#fff;border-bottom-style:solid;border-bottom-color:#fff}.hh_panel{overflow:hidden;min-height:100px}.hh_panel li{overflow:hidden}.hh_panel button,.hh_panel label{font-variant:small-caps;text-transform:lowercase;font-weight:bolder;text-shadow:1px 1px 3px rgba(255, 255, 255, 1)}.hh_panel label{text-align:center;width:25%;float:left;padding-top:7px}.hh_panel input{padding:5px;float:right;width:70%}.hh_panel button{width:25%;height:30px;padding-top:0;font-size:18px}.hh_content{font:400 13px arial,sans-serif;position:relative;min-height:200px;height:88%;overflow:hidden;padding:2px;border:1px solid rgba(0, 0, 0, 0.3);background:#f9f9f9;box-shadow:inset 2px 0 3px rgba(0, 0, 0, 0.4)}.hh_content ul{position:relative;overflow:hidden;overflow-y:auto; min-height:180px; height:100%}.hh_content li{border-radius:3px;overflow:hidden;padding:5px;margin:3px;position:relative;color:#444;background:rgba(0, 0, 0, 0.2);border:1px dotted rgba(0, 0, 0, 0.5)}.hh_jobtitle{width:100%;vertical-align:middle;overflow:hidden}.hh_jobtitle a{display:inline-block;white-space:nowrap;text-overflow:ellipsis;font-size:16px;text-shadow:1px 1px 3px rgba(0, 0, 0, 1);font-weight:bolder}.hh_jobtitle span{position:absolute;display:inline-block;font-size:11px;top:1px;right:3px;z-index:1}.hh_jobbody{overflow:hidden;vertical-align:middle}.hh_jobbody img,.hh_jobbody>div{display:inline-block;height:auto;overflow:hidden}.hh_salary{padding-top:5px;display:inline-block;font-size:16px;font-weight:700}.hh_jobbody img{margin:5px}'));
        document.documentElement.insertBefore(
            estyle,
            document.documentElement.lastChild
        );

        d3.select(window)
            .on('resize', nextData);

        container.append('div')
            .attr('class', 'hh_widget')
            .call(function(div) {
                div.append('div')
                    .attr('class', 'hh_panel')
                    .append('ul')
                    .selectAll('li')
                    .data([
                    {id : '_hh_search', label : 'search:', dom : 'input', type : 'search'},
                    {id : '_hh_period', label : 'period (days):', dom : 'input', type : 'number', value : 1, min: 1},
                    {id : '_hh_submit', label : 'search', dom : 'button', onclick : button}])
                    .enter()
                    .append('li')
                    .each(function(d, li) {
                        li = d3.select(this);

                        d.dom !== 'button'
                            && d.label
                        && li.append('label')
                            .attr('for', d.id)
                            .text(d.label);

                        var dom = li.append(d.dom)
                            .attr('id', d.id);

                        d.dom === 'button' && dom.text(d.label);

                        if (d.onclick)
                            dom.on('click', d.onclick || null);

                        if (d.dom === 'input') {
                            if (d.value)
                                dom.attr('value', d.value);

                            if (d.min)
                                dom.attr('min', d.min);

                            if (d.max)
                                dom.attr('max', d.max);
                        }

                        self[d.id] = dom;
                    });

                content = div.append('div')
                    .attr("class", 'hh_content')
                    .append('ul')
                    .attr('id', '_hh_list')
                    .on('scroll', nextData);
                loading = content.append('li').attr('id', '_hh_loading').text('loading pleas wait...');

                getData();
            });
    }
};