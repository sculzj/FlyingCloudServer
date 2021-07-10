const path=require('path');
const htmlWebpackPlugin=require('html-webpack-plugin');
module.exports={
    entry: [__dirname+'/public/javascripts/index.js'],
    output: {
        filename: "app.js",
        path: path.join(__dirname,'dist')
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: ['style-loader','css-loader']
            },
            {
                test: /\.(jpg|png)$/,
                // type: 'asset/resource'
                use: 'url-loader'

            },
            {
                test: /\.html$/,
                loader: 'html-loader',

            }
        ]
    },
    plugins: [
        new htmlWebpackPlugin({
            template: "./public/index.html"
        })
    ],
    mode: "development"
}