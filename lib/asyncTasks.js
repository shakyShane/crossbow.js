var utils = require("./utils");
var layouts = require("./layouts");

module.exports.tasks = [
    transformData,
    transformContent,
    handleSimpleMode,
    flattenBeforeTransforms,
    transformContentAfterTemplates,
    buildLayouts
    //renderContent
];

/**
 * Data transformations before an item is parsed
 * @param compiler
 * @param item
 * @param done
 */
function transformData (compiler, item, done) {
    done(null, {
        globalData: runTransforms({
            compiler: compiler,
            item: item,
            scope: "before item parsed"
        })
    });
}

function flattenBeforeTransforms (compiler, item, done) {

    compiler.hb.renderTemplate(item.content, compiler.globalData, function (err, out) {
        if (err) {
            return done(err);
        }

        done(null, {
            item: {
                content: out
            }
        });
    });
}

/**
 * Data transformations before an item is parsed
 * @param compiler
 * @param item
 * @param done
 */
function buildLayouts (compiler, item, done) {

    /**
     * If no layout specified in front-matter
     * & no default layout file, exit early and don't modify item content
     */
    if (!item.front.layout && !compiler.config.get("defaultLayout")) {
        return done();
    }

    /**
     * Set the scene for the first occurence of {{content}}
     */
    compiler.hb.addContent({
        content: item.compiled,
        config:  compiler.config,
        context: compiler.globalData
    });

    /**
     * Recursively add layouts
     */
    layouts(compiler, item.front.layout || "default.hbs", item, function (err, out) {
        done(null, {
            item: {
                compiled: out.content
            }
        });
    });

}

/**
 * Content transformations before an item is parsed
 * @param compiler
 * @param item
 * @param done
 */
function transformContent (compiler, item, done) {
    done(null, {
        item: {
            content: runContentTransforms({
                compiler: compiler,
                item: item,
                content: item.content,
                scope: "before item parsed"
            })
        }
    });
}

/**
 * @param compiler
 * @param item
 * @param done
 * @returns {*}
 */
function handleSimpleMode (compiler, item, done) {

    if (compiler.config.get("simpleMode")) {
        return done(null, {
            globalData: utils.prepareSandbox(item.data, compiler.globalData)
        });
    }

    done();
}

/**
 * @param compiler
 * @param item
 * @param done
 */
function transformContentAfterTemplates (compiler, item, done) {

    done(null, {
        item: {
            compiled: runContentTransforms({
                compiler: compiler,
                item: item,
                content: item.content,
                scope: "before item render"
            })
        }
    });
}

/**
 * @param compiler
 * @param item
 * @param done
 */
function renderContent (compiler, item, done) {

    console.log(compiler.hb.renderTemplate(item.compiled, compiler.globalData));

    done(null, {
        item: {
            compiled: compiler.hb.renderTemplate(item.compiled, compiler.globalData)
        }
    });
}

/**
 * @param opts
 * @returns {data|*}
 */
function runTransforms (opts) {

    require("lodash").each(opts.compiler.dataTransforms, function (plugin) {
        if (plugin.when === opts.scope) {
            opts.compiler.globalData = plugin.fn(opts.item || {}, opts.compiler.globalData || {}, opts.compiler.config);
        }
    });

    return opts.compiler.globalData;
}

module.exports.runTransforms = runTransforms;

/**
 * @param opts
 * @returns {*}
 */
function runContentTransforms(opts) {

    require("lodash").each(opts.compiler.contentTransforms, function (plugin) {
        if (plugin.when === opts.scope) {
            opts.item.content = plugin.fn(opts.content, opts.item, opts.compiler.config);
        }
    });

    return opts.item.content;
}